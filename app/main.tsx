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
import { getDatabase, ref, set, get, remove } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useNavigation } from '@react-navigation/native';

// Define types for TypeScript
type Post = {
    imageUrl: string;
    storagePath: string;
    caption: string;
    timestamp: number;
    userName: string;
    profileImage?: string;
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
    const navigation = useNavigation<NavigationProps>();

    // Function to delete expired posts
    const deleteExpiredPosts = async (userId: string, post: Post) => {
        try {
            const database = getDatabase();
            const storage = getStorage();

            // Delete post data from Realtime Database
            await remove(ref(database, `posts/${userId}`));

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

    useEffect(() => {
        let isMounted = true;
        let midnightTimeout: NodeJS.Timeout;

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

                    // Check if post should be deleted
                    if (shouldDeletePost(post.timestamp)) {
                        await deleteExpiredPosts(user.uid, post);
                    } else {
                        setCurrentPost(post);
                        setCanPost(false);
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                Alert.alert('Error', 'Failed to load data');
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        // Set up midnight deletion timer
        const setupMidnightDeletion = () => {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            const timeUntilMidnight = midnight.getTime() - now.getTime();

            midnightTimeout = setTimeout(async () => {
                if (currentPost) {
                    const user = auth.currentUser;
                    if (user) {
                        await deleteExpiredPosts(user.uid, currentPost);
                    }
                }
                // Recursively set up next day's deletion
                setupMidnightDeletion();
            }, timeUntilMidnight);
        };

        fetchUserData();
        setupMidnightDeletion();

        // Cleanup function
        return () => {
            isMounted = false;
            if (midnightTimeout) {
                clearTimeout(midnightTimeout);
            }
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
            try {
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
                console.error('Upload error:', error);
                throw error;
            }
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
        <SafeAreaView style={styles.container}>
            {/* Header with logo */}
            <View style={styles.header}>
                <Image source={require('../assets/images/colorLogo.png')} style={styles.logo} />
            </View>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
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
                                placeholderTextColor="#666"
                            />
                            <TouchableOpacity
                                style={styles.postButton}
                                onPress={handlePost}
                                disabled={loading}
                            >
                                <Text style={styles.postButtonText}>
                                    {loading ? 'Posting...' : 'Share Post'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* Display current post if exists */}
                    {currentPost && !image && (
                        <View style={styles.postCard}>
                            <View style={styles.postHeader}>
                                <View style={styles.userInfo}>
                                    {currentPost.profileImage ? (
                                        <Image
                                            source={{ uri: currentPost.profileImage }}
                                            style={styles.profileImage}
                                        />
                                    ) : (
                                        <View style={styles.profileImagePlaceholder} />
                                    )}
                                    <Text style={styles.userName}>{currentPost.userName}</Text>
                                </View>
                                <Text style={styles.timestamp}>
                                    {new Date(currentPost.timestamp).toLocaleDateString()}
                                </Text>
                            </View>
                            <Image
                                source={{ uri: currentPost.imageUrl }}
                                style={styles.postImage}
                                resizeMode="cover"
                            />
                            {currentPost.caption ? (
                                <Text style={styles.caption}>{currentPost.caption}</Text>
                            ) : null}
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Comments', { postId: uid })}
                                style={styles.commentButton}
                            >
                                <Text style={styles.commentButtonText}>View comments</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </TouchableWithoutFeedback>

            {/* Bottom navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <Text style={styles.navText}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => navigation.navigate('Main')}
                >
                    <Text style={[styles.navText, styles.activeNavText]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => navigation.navigate('AddFriends')}
                >
                    <Text style={styles.navText}>Add Friends</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        padding: 16,
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
        fontWeight: '700',
        marginBottom: 24,
        color: '#1F2937',
        letterSpacing: 0.5,
    },
    cameraButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366F1',
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
        backgroundColor: '#6366F1',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    postButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    postCard: {
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
        color: '#374151',
        lineHeight: 24,
        marginBottom: 12,
    },
    commentButton: {
        marginTop: 8,
        alignItems: 'center',
    },
    commentButtonText: {
        color: '#007BFF',
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: '#ddd',
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
    },
    navText: {
        fontSize: 16,
    },
});
