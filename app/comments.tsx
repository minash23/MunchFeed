import React, { useState, useEffect } from 'react';
import {
    SafeAreaView,
    ScrollView,
    TextInput,
    Text,
    StyleSheet,
    View,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Dimensions
} from 'react-native';
import { auth, database } from '../config/firebaseConfig';
import { ref, set, push, onValue, get, remove, update } from 'firebase/database';
import { useRoute } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from "@react-navigation/native";

interface Comment {
    userId: string;
    userName: string;
    userProfileImage?: string;
    text: string;
    timestamp: number;
    id?: string;
    likes: number;
    likedBy?: { [key: string]: boolean };
}

interface PostDetails {
    caption: string;
    imageUrl?: string;
    timestamp: number;
    userId: string;
    userName: string;
    profileImage?: string;
}

type NavigationProps = {
    navigate: (screen: string, params?: any) => void;
};

const COMMENTS_PER_PAGE = 20;

function CommentsPage() {
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [postDetails, setPostDetails] = useState<PostDetails | null>(null);
    const [page, setPage] = useState(1);
    const [hasMoreComments, setHasMoreComments] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const navigation = useNavigation<NavigationProps>();
    const route = useRoute();
    const { postId } = route.params as { postId: string };
    const currentUserId = auth.currentUser?.uid;

    const fetchPostDetails = async () => {
        try {
            const postRef = ref(database, `posts/${postId}`);
            const postSnapshot = await get(postRef);

            if (postSnapshot.exists()) {
                const postData = postSnapshot.val();
                const userRef = ref(database, `users/${postData.userId}`);
                const userSnapshot = await get(userRef);

                if (userSnapshot.exists()) {
                    const userData = userSnapshot.val();
                    setPostDetails({
                        caption: postData.caption,
                        imageUrl: postData.imageUrl,
                        timestamp: postData.timestamp,
                        userId: postData.userId,
                        userName: userData.username,
                        profileImage: userData.profileImage
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching post details:', error);
            Alert.alert('Error', 'Failed to load post details');
        }
    };

    const fetchComments = async (shouldRefresh = false) => {
        try {
            const commentsRef = ref(database, `posts/${postId}/comments`);
            onValue(commentsRef, async (snapshot) => {
                if (snapshot.exists()) {
                    const commentsData: Comment[] = [];
                    const commentSnapshots = snapshot.val();

                    const startIndex = shouldRefresh ? 0 : (page - 1) * COMMENTS_PER_PAGE;
                    const endIndex = startIndex + COMMENTS_PER_PAGE;

                    const commentPromises = Object.entries(commentSnapshots)
                        .sort(([, a]: any, [, b]: any) => b.timestamp - a.timestamp)
                        .slice(startIndex, endIndex)
                        .map(async ([key, comment]: [string, any]) => {
                            try {
                                const userRef = ref(database, `users/${comment.userId}`);
                                const userSnapshot = await get(userRef);

                                if (userSnapshot.exists()) {
                                    const userData = userSnapshot.val();
                                    return {
                                        ...comment,
                                        id: key,
                                        userName: userData.username,
                                        userProfileImage: userData.profileImage,
                                        likes: comment.likes || 0,
                                        likedBy: comment.likedBy || {}
                                    };
                                }
                            } catch (error) {
                                console.error('Error fetching user data for comment:', error);
                                return null;
                            }
                        });

                    const resolvedComments = await Promise.all(commentPromises);
                    const validComments = resolvedComments.filter(comment => comment !== null) as Comment[];

                    setHasMoreComments(Object.keys(commentSnapshots).length > endIndex);
                    setComments(shouldRefresh ? validComments : [...comments, ...validComments]);
                } else {
                    setComments([]);
                    setHasMoreComments(false);
                }
                setIsLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            });
        } catch (error) {
            console.error('Error fetching comments:', error);
            setIsLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchPostDetails();
        fetchComments(true);
    }, [postId]);

    useEffect(() => {
        if (page > 1) {
            fetchComments();
        }
    }, [page]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMoreComments) {
            setLoadingMore(true);
            setPage(prevPage => prevPage + 1);
        }
    };

    const formatTimestamp = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
    };

    const likeComment = async (commentId: string) => {
        if (!currentUserId) return;

        try {
            const commentRef = ref(database, `posts/${postId}/comments/${commentId}`);
            const snapshot = await get(commentRef);

            if (snapshot.exists()) {
                const comment = snapshot.val();
                const likedBy = comment.likedBy || {};
                const hasLiked = likedBy[currentUserId];

                await update(commentRef, {
                    likes: (comment.likes || 0) + (hasLiked ? -1 : 1),
                    [`likedBy/${currentUserId}`]: !hasLiked
                });
            }
        } catch (error) {
            console.error('Error liking comment:', error);
            Alert.alert('Error', 'Failed to like comment');
        }
    };

    const deleteComment = async (commentId: string, userId: string) => {
        // Check if the current user is either the comment author or the post owner
        if (currentUserId !== userId && currentUserId !== postDetails?.userId) {
            Alert.alert('Error', 'You can only delete comments on your post or your own comments');
            return;
        }

        Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await remove(ref(database, `posts/${postId}/comments/${commentId}`));
                        } catch (error) {
                            console.error('Error deleting comment:', error);
                            Alert.alert('Error', 'Failed to delete comment');
                        }
                    }
                }
            ]
        );
    };

    const postComment = async () => {
        if (!commentText.trim()) return;

        const userId = auth.currentUser?.uid;
        if (!userId) {
            Alert.alert('Error', 'Please log in to comment');
            return;
        }

        setIsPosting(true);
        try {
            const newCommentRef = push(ref(database, `posts/${postId}/comments`));
            await set(newCommentRef, {
                userId,
                text: commentText.trim(),
                timestamp: Date.now(),
                likes: 0,
                likedBy: {}
            });
            setCommentText('');
            Keyboard.dismiss();
        } catch (error) {
            console.error('Error posting comment:', error);
            Alert.alert('Error', 'Failed to post comment');
        } finally {
            setIsPosting(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchPostDetails();
        fetchComments(true);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.inner}
                keyboardVerticalOffset={100}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollViewContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    onScroll={({ nativeEvent }) => {
                        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                        const isEndReached = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
                        if (isEndReached) {
                            handleLoadMore();
                        }
                    }}
                    scrollEventThrottle={400}
                >
                    {isLoading ? (
                        <ActivityIndicator size="large" color="#0000ff" />
                    ) : (
                        <>
                            {postDetails && (
                                <View style={styles.postDetailsContainer}>
                                    <Image
                                        source={
                                            postDetails.profileImage
                                                ? { uri: postDetails.profileImage }
                                                : require('../assets/images/defaultPFP.png')
                                        }
                                        style={styles.postOwnerPFP}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.commentUserName}>
                                            {postDetails.userName}
                                        </Text>
                                        <Text style={styles.postCaption}>
                                            {postDetails.caption}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {comments.map(comment => (
                                <Swipeable
                                    key={comment.id}
                                    renderRightActions={() =>
                                        (currentUserId === comment.userId || currentUserId === postDetails?.userId) ? (
                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={() => comment.id && deleteComment(comment.id, comment.userId)}
                                            >
                                                <Ionicons name="trash-outline" size={24} color="white" />
                                            </TouchableOpacity>
                                        ) : null
                                    }
                                >
                                    <View style={styles.commentContainer}>
                                        <View style={styles.commentLeft}>
                                            <TouchableOpacity
                                                onPress={() => navigation.navigate('ViewProfile', { userId: comment.userId })}
                                                style={styles.userInfoContainer}
                                            >
                                                <Image
                                                    source={
                                                        comment.userProfileImage
                                                            ? { uri: comment.userProfileImage }
                                                            : require('../assets/images/defaultPFP.png')
                                                    }
                                                    style={styles.commentUserImage}
                                                />
                                                <Text style={styles.commentUserName}>{comment.userName}</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.commentText}>{comment.text}</Text>
                                        </View>

                                        <View style={styles.commentRight}>
                                            <Text style={styles.commentTimestamp}>
                                                {formatTimestamp(comment.timestamp)}
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() => comment.id && likeComment(comment.id)}
                                                style={styles.likeButton}
                                            >
                                                <Ionicons
                                                    name={comment.likedBy?.[currentUserId || ''] ? 'heart' : 'heart-outline'}
                                                    size={20}
                                                    color="red"
                                                />
                                                <Text style={styles.likeCount}>{comment.likes}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </Swipeable>
                            ))}

                            {loadingMore && <ActivityIndicator size="small" color="#0000ff" />}
                        </>
                    )}
                </ScrollView>

                <View style={styles.commentInputContainer}>
                    <TextInput
                        style={styles.commentInput}
                        value={commentText}
                        onChangeText={setCommentText}
                        placeholder="Write a comment..."
                        placeholderTextColor="#A9A9A9AC"
                        multiline
                        returnKeyType="send"
                        onSubmitEditing={postComment}
                    />
                    {isPosting ? (
                        <ActivityIndicator size="small" color="#4CAF50" />
                    ) : (
                        <TouchableOpacity
                            style={[
                                styles.postButton,
                                !commentText.trim() && styles.postButtonDisabled
                            ]}
                            onPress={postComment}
                            disabled={!commentText.trim()}
                        >
                            <Ionicons name="send" size={24} color="white" />
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

export default CommentsPage;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    inner: {
        flex: 1,
    },
    scrollViewContent: {
        paddingBottom: 20,
    },
    postDetailsContainer: {
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    postOwnerPFP: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        marginLeft: -5,
    },
    postImage: {
        width: '100%',
        height: 300,
        resizeMode: 'cover',
    },
    postCaption: {
        flex: 1,
        fontSize: 16,
        color: '#000',
        paddingTop: 1,
        fontWeight: '400',
        textAlign: 'left',
        fontFamily: 'Trebuchet MS',
    },
    commentContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    commentLeft: {
        flex: 1,
        flexDirection: 'column',
    },
    commentRight: {
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        paddingTop: 5,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    commentUserImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
    },
    userInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    commentUserName: {
        fontWeight: 'bold',
        fontFamily: 'Trebuchet MS',
    },
    commentTimestamp: {
        fontSize: 12,
        color: '#888',
        marginLeft: 10,
        marginBottom: 5,
    },
    commentText: {
        fontSize: 14,
        fontFamily: 'Trebuchet MS',
    },
    commentActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    likeButton: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    likeCount: {
        marginLeft: 5,
    },
    deleteButton: {
        backgroundColor: 'red',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
    },
    commentInputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    commentInput: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        paddingLeft: 15,
        marginRight: 10,
    },
    postButton: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#007AFF',
        borderRadius: 50,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: 50,
    },
    emptyStateText: {
        fontSize: 18,
        color: '#666',
        marginTop: 10,
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        fontWeight: '600',
    },
    emptyStateSubText: {
        fontSize: 14,
        color: '#999',
        marginTop: 5,
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
    },
});

