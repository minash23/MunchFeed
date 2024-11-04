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
import { ref, set, push, onValue, get, serverTimestamp } from 'firebase/database';
import { useRoute } from "@react-navigation/core";
import { Ionicons } from '@expo/vector-icons'; // Make sure to install

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
}

interface PostDetails {
    caption: string;
    imageUrl?: string;
    timestamp: number;
}

export default function CommentsPage() {
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<Comment[]>([]);
    const [postOwnerName, setPostOwnerName] = useState('');
    const [postOwnerProfile, setPostOwnerProfile] = useState('');
    const [caption, setCaption] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [postDetails, setPostDetails] = useState<PostDetails | null>(null);

    const route = useRoute();
    const { postId } = route.params as { postId: string };

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
                        timestamp: postData.timestamp || Date.now()
                    });
                    setCaption(postData.caption);
                }
            }
        } catch (error) {
            console.error('Error fetching post details:', error);
            Alert.alert('Error', 'Failed to load post details');
        }
    };

    const fetchComments = async () => {
        try {
            const commentsRef = ref(database, `comments/${postId}`);
            onValue(commentsRef, async (snapshot) => {
                if (snapshot.exists()) {
                    const commentsData: Comment[] = [];
                    const commentSnapshots = snapshot.val();

                    for (let key in commentSnapshots) {
                        const comment = commentSnapshots[key];
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
                                    timestamp: comment.timestamp || Date.now()
                                });
                            }
                        } catch (error) {
                            console.error('Error fetching user data for comment:', error);
                        }
                    }

                    // Sort comments by timestamp
                    commentsData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    setComments(commentsData);
                } else {
                    setComments([]);
                }
                setIsLoading(false);
                setRefreshing(false);
            });
        } catch (error) {
            console.error('Error fetching comments:', error);
            setIsLoading(false);
            setRefreshing(false);
            Alert.alert('Error', 'Failed to load comments');
        }
    };

    useEffect(() => {
        fetchPostDetails();
        fetchComments();
    }, [postId]);

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
                    timestamp: Date.now()
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
        fetchPostDetails();
        fetchComments();
    };

    const renderCommentItem = (comment: Comment) => (
        <View key={comment.id} style={styles.commentContainer}>
            <Image
                source={comment.userProfileImage ? { uri: comment.userProfileImage } : require('../assets/images/defaultPFP.png')}
                style={styles.commentProfileImage}
            />
            <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                    <Text style={styles.commentUserName}>{comment.userName}</Text>
                    <Text style={styles.timestamp}>{formatTimestamp(comment.timestamp || 0)}</Text>
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <SafeAreaView style={styles.container}>
                {/* Post Owner's Details */}
                <View style={styles.postOwnerContainer}>
                    <Image
                        source={postOwnerProfile ? { uri: postOwnerProfile } : require('../assets/images/defaultPFP.png')}
                        style={styles.profileImage}
                    />
                    <View style={styles.postOwnerInfo}>
                        <Text style={styles.postOwnerName}>{postOwnerName}</Text>
                        <Text style={styles.caption}>{caption}</Text>
                        {postDetails?.timestamp && (
                            <Text style={styles.postTimestamp}>
                                {formatTimestamp(postDetails.timestamp)}
                            </Text>
                        )}
                    </View>
                </View>

                {isLoading ? (
                    <ActivityIndicator style={styles.loader} size="large" color="black" />
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.scrollViewContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="black"
                            />
                        }
                    >
                        {comments.length > 0 ? (
                            comments.map(renderCommentItem)
                        ) : (
                            <View style={styles.emptyStateContainer}>
                                <Ionicons name="chatbubble-outline" size={50} color="gray" />
                                <Text style={styles.emptyStateText}>No comments yet</Text>
                                <Text style={styles.emptyStateSubText}>Be the first to comment!</Text>
                            </View>
                        )}
                    </ScrollView>
                )}

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Add a comment..."
                        value={commentText}
                        onChangeText={setCommentText}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[
                            styles.postButton,
                            (!commentText.trim() || isPosting) && styles.postButtonDisabled
                        ]}
                        onPress={postComment}
                        disabled={!commentText.trim() || isPosting}
                    >
                        {isPosting ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text style={styles.postButtonText}>Post</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollViewContent: {
        flexGrow: 1,
    },
    postOwnerContainer: {
        flexDirection: 'row',
        padding: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e0e0e0',
    },
    postOwnerInfo: {
        flex: 1,
        marginLeft: 10,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    postOwnerName: {
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    caption: {
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        fontSize: 14,
        color: '#000',
        marginBottom: 4,
    },
    postTimestamp: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    commentContainer: {
        flexDirection: 'row',
        padding: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e0e0e0',
    },
    commentContent: {
        flex: 1,
        marginLeft: 10,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    commentProfileImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    commentUserName: {
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        fontSize: 14,
        fontWeight: '600',
    },
    commentText: {
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        fontSize: 14,
        color: '#000',
    },
    timestamp: {
        fontSize: 12,
        color: '#666',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#e0e0e0',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        minHeight: 36,
        maxHeight: 100,
        borderColor: '#e0e0e0',
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 15,
        paddingTop: 8,
        paddingBottom: 8,
        marginRight: 10,
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        fontSize: 14,
    },
    postButton: {
        backgroundColor: 'black',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    postButtonDisabled: {
        backgroundColor: '#ccc',
    },
    postButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
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
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
