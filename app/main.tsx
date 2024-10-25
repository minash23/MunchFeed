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
    TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../config/firebaseConfig';
import { getDatabase, ref, set, get } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useNavigation } from '@react-navigation/native';

// Define types
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

export default function MainPage() {
    const [uid, setUid] = useState<string>('');
    const [userName, setUserName] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [image, setImage] = useState<string>('');
    const [profileImage, setProfileImage] = useState<string>('');
    const [imageName, setImageName] = useState<string>('');
    const [caption, setCaption] = useState<string>('');
    const [currentPost, setCurrentPost] = useState<Post | null>(null);
    const navigation = useNavigation<NavigationProps>();

    useEffect(() => {
        let isMounted = true;

        const fetchUserData = async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    setLoading(false);
                    return;
                }

                if (isMounted) {
                    setUid(user.uid);
                }

                const database = getDatabase();
                const userRef = ref(database, `users/${user.uid}`);
                const snapshot = await get(userRef);

                if (!snapshot.exists() || !isMounted) return;

                const userData = snapshot.val();
                if (isMounted) {
                    setUserName(userData.username || '');
                    setProfileImage(userData.profileImage || '');
                }

                // Fetch user's post
                const postRef = ref(database, `posts/${user.uid}`);
                const postSnapshot = await get(postRef);

                if (postSnapshot.exists() && isMounted) {
                    setCurrentPost(postSnapshot.val());
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

        fetchUserData();

        return () => {
            isMounted = false;
        };
    }, []);

    const openCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Camera permission is required');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            });

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

    const handlePost = async () => {
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

            const storage = getStorage();

            // If there's an existing post, delete the old image from storage
            if (currentPost?.storagePath) {
                try {
                    const oldImageRef = storageRef(storage, currentPost.storagePath);
                    await deleteObject(oldImageRef).catch(error => {
                        console.log('Old image not found or already deleted:', error);
                    });
                } catch (error) {
                    console.error('Error deleting old image:', error);
                }
            }

            // Upload new image
            try {
                const response = await fetch(image);
                const blob = await response.blob();

                const timestamp = Date.now();
                const uniqueImageName = `${timestamp}_${imageName}`;
                const imageStorageRef = storageRef(storage, `images/${uniqueImageName}`);

                await uploadBytes(imageStorageRef, blob);
                const downloadURL = await getDownloadURL(imageStorageRef);

                // Save post data
                const database = getDatabase();
                const postRef = ref(database, `posts/${user.uid}`);

                const postData: Post = {
                    imageUrl: downloadURL,
                    storagePath: `images/${uniqueImageName}`,
                    caption: caption.trim(),
                    timestamp,
                    userName
                };

                await set(postRef, postData);

                // Update local state
                setCurrentPost(postData);

                // Reset form
                setImage('');
                setImageName('');
                setCaption('');

                Alert.alert('Success', 'Post updated successfully!');
            } catch (error) {
                console.error('Upload error:', error);
                throw error;
            }
        } catch (error) {
            console.error('Post error:', error);
            Alert.alert('Error', 'Failed to update post');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#0000ff" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Image source={require('../assets/images/adaptive-icon.png')} style={styles.logo} />
            </View>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <Text style={styles.welcomeText}>Welcome {userName || 'Guest'}!</Text>

                    <TouchableOpacity onPress={openCamera} style={styles.cameraButton}>
                        <Image source={require('../assets/images/add.png')} style={styles.uploadImage} />
                        <Text style={styles.cameraButtonText}>
                            {currentPost ? 'Update Your Post' : 'Create Your Post'}
                        </Text>
                    </TouchableOpacity>

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
                            />
                            <TouchableOpacity
                                style={styles.postButton}
                                onPress={handlePost}
                                disabled={loading}
                            >
                                <Text style={styles.postButtonText}>
                                    {loading ? 'Posting...' : (currentPost ? 'Update Post' : 'Share Post')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {currentPost && !image && (
                        <View style={styles.postCard}>
                            <View style={styles.postHeader}>
                                {currentPost.profileImage ? (
                                    <Image
                                        source={{ uri: currentPost.profileImage }}
                                        style={styles.profileImage}
                                    />
                                ) : null}
                                <Text style={styles.userName}>{currentPost.userName}</Text>
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
                    <Text style={styles.navText}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => navigation.navigate('AddFriends')}
                >
                    <Text style={styles.navText}>Friends</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        backgroundColor: '#fff',
    },
    logo: {
        width: 80,
        height: 80,
        resizeMode: 'contain',
    },
    scrollContainer: {
        padding: 15,
    },
    welcomeText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginVertical: 15,
        textAlign: 'center',
    },
    cameraButton: {
        alignItems: 'center',
        marginBottom: 20,
    },
    cameraButtonText: {
        marginTop: 5,
        fontSize: 16,
        color: '#666',
    },
    uploadImage: {
        width: 50,
        height: 50,
    },
    postContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    capturedImage: {
        width: '100%',
        height: 300,
        borderRadius: 10,
    },
    captionInput: {
        marginTop: 15,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    postButton: {
        backgroundColor: '#4CAF50',
        padding: 12,
        borderRadius: 5,
        marginTop: 15,
        alignItems: 'center',
    },
    postButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    postCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    postHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
    },
    userName: {
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'Trebuchet MS'
    },
    profileImage: {
      width: 40,
      height: 40,
      borderRadius: 25,
      marginRight: 10
    },
    timestamp: {
        color: '#666',
        fontSize: 12,
    },
    postImage: {
        width: '100%',
        height: 300,
    },
    caption: {
        padding: 15,
        fontSize: 14,
    },
    commentButton: {
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    commentButtonText: {
        color: '#666',
        fontSize: 14,
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 15,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    navItem: {
        padding: 5,
    },
    navText: {
        fontSize: 16,
        color: '#333',
    },
});