import React, { useState, useEffect, useCallback } from 'react';
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
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl
} from 'react-native';
import { auth, database } from '../config/firebaseConfig';
import { ref, set, push, onValue, get, remove, update } from 'firebase/database';
import { useRoute } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

interface User {
    userId: string;
    text: string;
    profileImage?: string;
}

interface Comment {
    userId: string;
    userName: string;
    userProfileImage?: string;
    text: string;
    timestamp?: number;
    id?: string;
    likes?: number;
    likedBy?: { [key: string]: boolean };
}

interface PostDetails {
    caption: string;
    imageUrl?: string;
    timestamp: number;
    userId?: string;
}

const COMMENTS_PER_PAGE = 20;



function CommentsPage() {
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<Comment[]>([]);
    const [postOwnerName, setPostOwnerName] = useState('');
    const [postOwnerProfile, setPostOwnerProfile] = useState('');
    const [caption, setCaption] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [postDetails, setPostDetails] = useState<PostDetails | null>(null);
    const [page, setPage] = useState(1);
    const [hasMoreComments, setHasMoreComments] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const route = useRoute();
    const { postId } = route.params as { postId: string };
    const currentUserId = auth.currentUser?.uid;

    const fetchPostDetails = async () => {
        try {
            const userRef = ref(database, `users/${postId}`);
            const userSnapshot = await get(userRef);

            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                setPostOwnerName(userData.username);
                setPostOwnerProfile(userData.profileImage);

                const postRef = ref(database, `posts/${postId}`);
                const postSnapshot = await get(postRef);

                if (postSnapshot.exists()) {
                    const postData = postSnapshot.val();
                    setPostDetails({
                        caption: postData.caption,
                        imageUrl: postData.imageUrl,
                        timestamp: postData.timestamp || Date.now(),
                        userId: postData.userId
                    });
                    setCaption(postData.caption);
                }
            }
        } catch (error) {
            console.error('Error fetching post details:', error);
            Alert.alert('Error', 'Failed to load post details');
        }
    };

    const fetchComments = async (shouldRefresh = false) => {
        try {
            const commentsRef = ref(database, `comments/${postId}`);
            onValue(commentsRef, async (snapshot) => {
                if (snapshot.exists()) {
                    const commentsData: Comment[] = [];
                    const commentSnapshots = snapshot.val();

                    const startIndex = shouldRefresh ? 0 : (page - 1) * COMMENTS_PER_PAGE;
                    const endIndex = startIndex + COMMENTS_PER_PAGE;

                    const commentEntries = Object.entries(commentSnapshots)
                        .sort(([, a]: any, [, b]: any) => b.timestamp - a.timestamp)
                        .slice(startIndex, endIndex);

                    for (const [key, comment] of commentEntries) {
                        try {
                            const userRef = ref(database, `users/${comment.userId}`);
                            const userSnapshot = await get(userRef);

                            if (userSnapshot.exists()) {
                                const userData = userSnapshot.val();
                                commentsData.push({
                                    ...comment,
                                    id: key,
                                    userName: userData.username,
                                    userProfileImage: userData.profileImage,
                                    timestamp: comment.timestamp || Date.now(),
                                    likes: comment.likes || 0,
                                    likedBy: comment.likedBy || {}
                                });
                            }
                        } catch (error) {
                            console.error('Error fetching user data for comment:', error);
                        }
                    }

                    setHasMoreComments(Object.keys(commentSnapshots).length > endIndex);
                    setComments(shouldRefresh ? commentsData : [...comments, ...commentsData]);
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
            Alert.alert('Error', 'Failed to load comments');
        }
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMoreComments) {
            setLoadingMore(true);
            setPage(prevPage => prevPage + 1);
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
            const commentRef = ref(database, `comments/${postId}/${commentId}`);
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
    // Only allow users to delete their own comments
    if (currentUserId !== userId) {
        Alert.alert('Error', 'You can only delete your own comments');
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
                        await remove(ref(database, `comments/${postId}/${commentId}`));
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
        const userRef = ref(database, `users/${userId}`);
        const userSnapshot = await get(userRef);

        if (userSnapshot.exists()) {
            const newCommentRef = push(ref(database, `comments/${postId}`));
            await set(newCommentRef, {
                userId,
                text: commentText.trim(),
                timestamp: Date.now(),
                likes: 0,
                likedBy: {}
            });
            setCommentText('');
            Keyboard.dismiss();
        }
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

const renderRightActions = (commentId: string, userId: string) => {
    // Only show delete option for user's own comments
    if (currentUserId !== userId) return null;

    return (
        <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteComment(commentId, userId)}
        >
            <Ionicons name="trash-outline" size={24} color="white" />
        </TouchableOpacity>
    );
};

const renderCommentItem = (comment: Comment) => (
    <Swipeable
        key={comment.id}
        renderRightActions={() => renderRightActions(comment.id!, comment.userId)}
        overshootRight={false}
    >
        <View style={styles.commentContainer}>
            <View style={styles.commentHeader}>
                <Image
                    source={comment.userProfileImage ?
                        { uri: comment.userProfileImage } :
                        require('../assets/images/defaultPFP.png')}
                    style={styles.commentUserImage}
                />
                <Text style={styles.commentUserName}>{comment.userName}</Text>
                <Text style={styles.commentTimestamp}>
                    {formatTimestamp(comment.timestamp!)}
                </Text>
            </View>
            <Text style={styles.commentText}>{comment.text}</Text>
            <View style={styles.commentActions}>
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
);

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
            >
                {isLoading ? (
                    <ActivityIndicator size="large" color="#0000ff" />
                ) : (
                    <>
                        {postDetails && (
                            <View style={styles.postDetailsContainer}>
                                <Image
                                    source={
                                    { uri: postOwnerProfile ||
                                            require('../assets/images/defaultPFP.png') }}
                                    style={styles.postOwnerPFP}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style ={styles.commentUserName}>{postOwnerName}</Text>
                                    <Text style={styles.postCaption}>{postDetails.caption}</Text>
                                </View>

                            </View>
                        )}

                        {comments.length > 0 ? (
                            comments.map(renderCommentItem)
                        ) : (
                            <Text style={[styles.commentText, { textAlign: 'center', marginTop: 20 }]}>
                                No comments yet
                            </Text>
                        )}

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
                    multiline
                    returnKeyType="send"
                    onSubmitEditing={postComment}
                />
                {isPosting ? (
                    <ActivityIndicator size="small" color="#4CAF50" />
                ) : (
                    <TouchableOpacity
                        style={styles.postButton}
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
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    commentUserImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
    },
    commentUserName: {
        fontWeight: 'bold',
    },
    commentTimestamp: {
        fontSize: 12,
        color: '#888',
        marginLeft: 10,
    },
    commentText: {
        marginVertical: 10,
        fontSize: 14,
    },
    commentActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    likeButton: {
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
        backgroundColor: '#4CAF50',
        borderRadius: 50,
    },
});

export default CommentsPage;