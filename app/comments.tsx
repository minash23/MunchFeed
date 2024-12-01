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
import { auth } from '../config/firebaseConfig';
import { getDatabase, ref, set, push, onValue, get, remove, update } from 'firebase/database';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

// TypeScript interfaces
interface Comment {
    id?: string;
    userId: string;
    userName: string;
    userProfileImage?: string;
    text: string;
    timestamp: number;
    likes: number;
    likedBy?: { [key: string]: boolean };
}

interface PostDetails {
    caption: string;
    imageUrl: string;
    timestamp: number;
    userId: string;
    userName: string;
    profileImage?: string;
}

interface RouteParams {
    postId: string;
    postData: PostDetails;
}

type NavigationProps = {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
};

//how many comments per page
const COMMENTS_PER_PAGE = 50;

const CommentsPage: React.FC = () => {
    // State management
    const [commentText, setCommentText] = useState<string>('');
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isPosting, setIsPosting] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [postDetails, setPostDetails] = useState<PostDetails | null>(null);
    const [page, setPage] = useState<number>(1);
    const [hasMoreComments, setHasMoreComments] = useState<boolean>(true);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);

    const navigation = useNavigation<NavigationProps>();
    const route = useRoute();
    const { postId, postData } = route.params as RouteParams;
    const currentUserId = auth.currentUser?.uid;
    const database = getDatabase();

    useEffect(() => {
        setPostDetails(postData);
        fetchComments(true);

        return () => {
            // Cleanup listener if needed
            const commentsRef = ref(database, `posts/${postId}/comments`);
            onValue(commentsRef, () => {});
        };
    }, [postId]);

    //fetches comments from specific post
    const fetchComments = async (shouldRefresh: boolean = false) => {
        try {
            const commentsRef = ref(database, `posts/${postId}/comments`);
            onValue(commentsRef, async (snapshot) => {
                if (snapshot.exists()) {
                    const commentsData: Comment[] = [];
                    const commentSnapshots = snapshot.val();

                    const startIndex = shouldRefresh ? 0 : (page - 1) * COMMENTS_PER_PAGE;
                    const endIndex = startIndex + COMMENTS_PER_PAGE;

                    const commentPromises = Object.entries(commentSnapshots)
                        .sort(([, a]: [string, any], [, b]: [string, any]) => b.timestamp - a.timestamp)
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
                                return null;
                            } catch (error) {
                                console.error('Error fetching user data for comment:', error);
                                return null;
                            }
                        });

                    const resolvedComments = await Promise.all(commentPromises);
                    const validComments = resolvedComments.filter((comment): comment is Comment => comment !== null);

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

//loading of the next page of comments if not already loading and if more comments are available.
    const handleLoadMore = () => {
        if (!loadingMore && hasMoreComments) {
            setLoadingMore(true);
            setPage(prevPage => prevPage + 1);
        }
    };

    //function to add time of when comment was posted
    const formatTimestamp = (timestamp: number): string => {
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

    //function to like comment and add to little heart on right
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

    //delete comment
    const deleteComment = async (commentId: string, userId: string) => {
        if (currentUserId !== userId && currentUserId !== postData.userId) {
            Alert.alert('Error', 'You can only delete your own comments or comments on your post');
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
                            setComments(prevComments =>
                                prevComments.filter(comment => comment.id !== commentId)
                            );
                        } catch (error) {
                            console.error('Error deleting comment:', error);
                            Alert.alert('Error', 'Failed to delete comment');
                        }
                    }
                }
            ]
        );
    };

    //post comment
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
            const timestamp = Date.now();

            const userRef = ref(database, `users/${userId}`);
            const userSnapshot = await get(userRef);
            const userData = userSnapshot.val();

            const newComment: Comment = {
                userId,
                text: commentText.trim(),
                timestamp,
                likes: 0,
                likedBy: {},
                userName: userData.username,
                userProfileImage: userData.profileImage
            };

            await set(newCommentRef, newComment);

            // Update local state
            setComments(prevComments => [{
                ...newComment,
                id: newCommentRef.key || undefined
            }, ...prevComments]);

            setCommentText('');
            Keyboard.dismiss();
        } catch (error) {
            console.error('Error posting comment:', error);
            Alert.alert('Error', 'Failed to post comment');
        } finally {
            setIsPosting(false);
        }
    };

    //refreshes to view new comments
    const onRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchComments(true);
    };

    //navigator
    const navigateToProfile = (userId: string) => {
        navigation.navigate('ViewProfile', { userId });
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#007AFF" />
            </SafeAreaView>
        );
    }

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
                    {postDetails && (
                        <View style={styles.postDetailsContainer}>
                            <TouchableOpacity
                                onPress={() => navigateToProfile(postDetails.userId)}
                                style={styles.userInfoContainer}
                            >
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
                            </TouchableOpacity>
                        </View>
                    )}

                    {comments.map(comment => (
                        <Swipeable
                            key={comment.id}
                            renderRightActions={() =>
                                (currentUserId === comment.userId || currentUserId === postData.userId) ? (
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
                                        onPress={() => navigateToProfile(comment.userId)}
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

                    {loadingMore && <ActivityIndicator size="small" color="#007AFF" style={styles.loadingMore} />}
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
                        <ActivityIndicator size="small" color="#007AFF" />
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
};

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
    postButtonDisabled: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#808080',
        borderRadius: 50,
    },
    loadingMore: {
        color: '#808080',
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

