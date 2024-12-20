import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    TextInput,
    Keyboard,
    TouchableWithoutFeedback,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../config/firebaseConfig';
import { getDatabase, ref, set, get, remove, onValue } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import defaultPFP from '../assets/images/defaultPFP.png';

// Define types for TypeScript
type Post = {
    imageUrl: string;
    storagePath: string;
    caption: string;
    timestamp: number;
    userName: string;
    profileImage?: string;
    friendId?: string;
};

type NavigationProps = {
    navigate: (screen: string, params?: any) => void;
};

// Get window width for responsive sizing
const { width } = Dimensions.get('window');

export default function MainPage() {
    // State management for user data and UI
    const [uid, setUid] = useState<string>('');
    const [userName, setUserName] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [image, setImage] = useState<string>('');
    const [profileImage, setProfileImage] = useState<string>('');
    const [imageName, setImageName] = useState<string>('');
    const [caption, setCaption] = useState<string>('');
    const [currentPost, setCurrentPost] = useState<Post | null>(null);
    const [canPost, setCanPost] = useState<boolean>(true);
    const [posts, setPosts] = useState<Post[]>([]);
    const navigation = useNavigation<NavigationProps>();

    // Function to delete expired posts
    const deleteExpiredPosts = async (userId: string, post: Post) => {
        try {
            const database = getDatabase();
            const storage = getStorage();

            // Delete post data from Realtime Database
            await remove(ref(database, `posts/${userId}`));
            // Delete comment data as well
            await remove(ref(database, `comments/${userId}`));

            // Delete image from Storage
            if (post.storagePath) {
                const imageRef = storageRef(storage, post.storagePath);
                await deleteObject(imageRef);
            }

            // Reset current post in state
            setCurrentPost(null);
            setCanPost(true);
        } catch (error) {
            console.error('Error deleting expired post:', error);
        }
    };

    // Check if a post should be deleted (older than current day)
    const shouldDeletePost = (timestamp: number): boolean => {
        const postDate = new Date(timestamp).setHours(0, 0, 0, 0);
        const today = new Date().setHours(0, 0, 0, 0);
        return postDate < today;
    };

    const navigateToProfile = (userId: string) => {
        navigation.navigate('ViewProfile', { userId });
    };

    const navigateToComments = (post: Post) => {
        navigation.navigate('Comments', {
            postId: post.friendId || uid,
            postData: {
                caption: post.caption,
                imageUrl: post.imageUrl,
                timestamp: post.timestamp,
                userId: post.friendId || uid,
                userName: post.userName,
                profileImage: post.profileImage
            }
        });
    };

    useEffect(() => {
        let isMounted = true;

        const fetchUserData = async () => {
            try {
                // Get current user
                const user = auth.currentUser;
                if (!user) {
                    setLoading(false);
                    return;
                }

                if (isMounted) {
                    setUid(user.uid);
                }

                // Fetch user profile data
                const database = getDatabase();
                const userRef = ref(database, `users/${user.uid}`);
                const snapshot = await get(userRef);

                if (!snapshot.exists() || !isMounted) return;

                const userData = snapshot.val();
                if (isMounted) {
                    setUserName(userData.username || '');
                    setProfileImage(userData.profileImage || '');
                }

                // Fetch user's current post
                const postRef = ref(database, `posts/${user.uid}`);
                const postSnapshot = await get(postRef);

                if (postSnapshot.exists() && isMounted) {
                    const post = postSnapshot.val();

                    if (shouldDeletePost(post.timestamp)) {
                        await deleteExpiredPosts(user.uid, post);
                    } else {
                        setCurrentPost(post);
                        setCanPost(false);
                    }
                }

                // Set up real-time listener for friends' posts
                const friendsRef = ref(database, `users/${user.uid}/friends`);
                onValue(friendsRef, async (friendsSnapshot) => {
                    if (friendsSnapshot.exists() && isMounted) {
                        const friendIds = Object.keys(friendsSnapshot.val());
                        const friendPosts: Post[] = [];

                        // Fetch posts for each friend
                        for (const friendId of friendIds) {
                            const friendPostRef = ref(database, `posts/${friendId}`);
                            const friendPostSnapshot = await get(friendPostRef);

                            if (friendPostSnapshot.exists()) {
                                const friendPost = friendPostSnapshot.val();
                                if (!shouldDeletePost(friendPost.timestamp)) {
                                    friendPost.friendId = friendId;
                                    friendPosts.push(friendPost);
                                }
                            }
                        }

                        if (isMounted) {
                            setPosts(friendPosts.sort((a, b) => b.timestamp - a.timestamp));
                        }
                    }
                });

            } catch (error) {
                console.error('Error fetching data:', error);
                Alert.alert('Error', 'Failed to load data');
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchUserData();

        return () => {
            isMounted = false;
        };
    }, []);

    // Handle camera functionality
    const openCamera = async () => {
        if (!canPost) {
            Alert.alert('Limit Reached', 'You can only post once per day. Try again tomorrow!');
            return;
        }

        try {
            // Request camera permissions
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Camera permission is required');
                return;
            }

            // Launch camera
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            });

            // Handle camera result
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const imageUri = result.assets[0].uri;
                const name = imageUri.substring(imageUri.lastIndexOf('/') + 1);
                setImage(imageUri);
                setImageName(name);
            }
        } catch (error) {
            console.error('Camera error:', error);
            Alert.alert('Error', 'Failed to open camera');
        }
    };

    // Handle post creation
    const handlePost = async () => {
        if (!canPost) {
            Alert.alert('Limit Reached', 'You can only post once per day. Try again tomorrow!');
            return;
        }

        if (!image) {
            Alert.alert('Error', 'Please take a photo first');
            return;
        }

        if (!userName) {
            Alert.alert('Error', 'User name not found');
            return;
        }

        try {
            setLoading(true);

            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'User not authenticated');
                return;
            }

            // Upload image to Firebase Storage
            const response = await fetch(image);
            const blob = await response.blob();

            const storage = getStorage();
            const timestamp = Date.now();
            const uniqueImageName = `${timestamp}_${imageName}`;
            const imageStorageRef = storageRef(storage, `images/${uniqueImageName}`);

            await uploadBytes(imageStorageRef, blob);
            const downloadURL = await getDownloadURL(imageStorageRef);

            // Save post data to Realtime Database
            const database = getDatabase();
            const postRef = ref(database, `posts/${user.uid}`);

            const postData: Post = {
                imageUrl: downloadURL,
                storagePath: `images/${uniqueImageName}`,
                caption: caption.trim(),
                timestamp,
                userName,
                profileImage
            };

            await set(postRef, postData);

            // Update local state
            setCurrentPost(postData);
            setCanPost(false);

            // Reset form
            setImage('');
            setImageName('');
            setCaption('');

            Alert.alert('Success', 'Post created successfully!');
        } catch (error) {
            console.error('Post error:', error);
            Alert.alert('Error', 'Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#6366F1" />
            </SafeAreaView>
        );
    }

    // Main render
    return (
        <View style={styles.container}>
            {/* Header with logo */}
            <View style={styles.header}>
                <Image source={require('../assets/images/blackLogo.png')} style={styles.logo} />
            </View>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                    {/* Welcome message */}
                    <Text style={styles.welcomeText}>Welcome back, {userName || 'Guest'}!</Text>

                    {/* Camera button */}
                    <TouchableOpacity
                        onPress={openCamera}
                        style={[styles.cameraButton, !canPost && styles.disabledButton]}
                        disabled={!canPost}
                    >
                        <Image source={require('../assets/images/add.png')} style={styles.uploadImage} />
                        <Text style={styles.cameraButtonText}>
                            {canPost ? 'Create Today\'s Post' : 'You\'ve already posted today'}
                        </Text>
                    </TouchableOpacity>

                    {/* New post creation form */}
                    {image ? (
                        <View style={styles.postContainer}>
                            <Image source={{ uri: image }} style={styles.capturedImage} />
                            <TextInput
                                style={styles.captionInput}
                                placeholder="Write a caption..."
                                value={caption}
                                onChangeText={setCaption}
                                multiline
                                maxLength={200}
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                                blurOnSubmit={true}
                                placeholderTextColor={'#A9A9A9AC'}
                            />
                            <TouchableOpacity style={styles.postButton} onPress={handlePost} disabled={loading}>
                                <Text style={styles.postButtonText}>{loading ? 'Posting...' : 'Share Post'}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* Display current post if exists */}
                    {currentPost && !image && (
                        <View style={styles.postCard}>
                            <View style={styles.postHeader}>
                                <View style={styles.userInfo}>
                                    <TouchableOpacity onPress={() => navigateToProfile(uid)} style={styles.postHeader}>
                                        <Image
                                            source={currentPost.profileImage ? { uri: currentPost.profileImage } : defaultPFP}
                                            style={styles.profileImage}
                                        />
                                        <Text style={styles.userName}>{currentPost.userName}</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.timestamp}>
                                    {new Date(currentPost.timestamp).toLocaleDateString()}
                                </Text>
                            </View>
                            <Image source={{ uri: currentPost.imageUrl }} style={styles.postImage} resizeMode="cover" />
                            {currentPost.caption ? <Text style={styles.caption}>{currentPost.caption}</Text> : null}
                            <TouchableOpacity
                                onPress={() => navigateToComments(currentPost)}
                                style={styles.commentButton}
                            >
                                <Icon name="comment" size={16} color="#007BFF" />
                                <Text style={styles.commentButtonText}>View comments</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Display friends' posts */}
                    {posts.map((post, index) => (
                        <View key={index} style={styles.postCard}>
                            <View style={styles.postHeader}>
                                <View style={styles.userInfo}>
                                    <TouchableOpacity
                                        onPress={() => navigateToProfile(post.friendId)}
                                        style={styles.postHeader}
                                    >
                                        <Image
                                            source={post.profileImage ? { uri: post.profileImage } : defaultPFP}
                                            style={styles.profileImage}
                                        />
                                        <Text style={styles.userName}>{post.userName}</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.timestamp}>
                                    {new Date(post.timestamp).toLocaleDateString()}
                                </Text>
                            </View>
                            <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
                            {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
                            <TouchableOpacity
                                onPress={() => navigateToComments(post)}
                                style={styles.commentButton}
                            >
                                <Icon name="comment" size={16} color="#007BFF" />
                                <Text style={styles.commentButtonText}>View comments</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            </TouchableWithoutFeedback>

            {/* Bottom navigation inside SafeAreaView */}
            <SafeAreaView style={styles.bottomNav}>
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <Icon name="user" size={24} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => navigation.navigate('Main')}
                >
                    <Icon name="home" size={24} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => navigation.navigate('AddFriends')}
                >
                    <Icon name="user-plus" size={24} color="#000" />
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        paddingTop: 0,
        paddingBottom: 6,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    scrollContainer: {
        padding: 16,
        flexGrow: 1,
    },
    welcomeText: {
        fontSize: 28,
        fontFamily: 'Trebuchet MS',
        fontWeight: 'bold',
        marginBottom: 24,
        color: '#1F2937',
        letterSpacing: 0.5,
    },
    cameraButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        backgroundColor: '#D1D5DB',
        shadowColor: '#9CA3AF',
    },
    uploadImage: {
        width: 24,
        height: 24,
        marginRight: 12,
        tintColor: '#fff',
    },
    cameraButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    postContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    capturedImage: {
        width: '100%',
        height: width * 0.8,
        borderRadius: 12,
        marginBottom: 16,
    },
    captionInput: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        fontSize: 16,
        color: '#1F2937',
        minHeight: 100,
    },
    postButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    postButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Trebuchet MS',
        fontWeight: '600',
    },
    postCard: {
        width: width,
        alignSelf: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    profileImagePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E5E7EB',
        marginRight: 12,
    },
    userName: {
        fontSize: 16,
        fontFamily: 'Trebuchet MS',
        fontWeight: '600',
        color: '#1F2937',
    },
    timestamp: {
        fontSize: 14,
        color: '#6B7280',
    },
    postImage: {
        width: '100%',
        height: width * 0.8,
        borderRadius: 12,
        marginBottom: 12,
    },
    caption: {
        fontSize: 16,
        fontFamily: 'Trebuchet MS',
        color: '#374151',
        lineHeight: 24,
        marginBottom: 12,
        paddingLeft: 4,
    },
    commentButton: {
        marginTop: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingLeft: 4,
    },
    commentButtonText: {
        marginLeft: 6,
        color: '#007BFF',
        fontFamily: 'Trebuchet MS',
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        paddingBottom: 5,
        borderTopWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#fff',
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
    },
});
