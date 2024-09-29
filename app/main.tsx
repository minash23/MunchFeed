import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker'; // Import the Image Picker API
import { auth } from '../config/firebaseConfig'; // Firebase configuration
import { getDatabase, ref, query, orderByChild, equalTo, set, get } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase Storage
import { useNavigation } from '@react-navigation/native';

// Image assets
import Logo from '../assets/images/adaptive-icon.png';
import upload from '../assets/images/add.png';

export default function MainPage() {
    const [uid, setUid] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [image, setImage] = useState<string | null>(null); // State to store the selected image URI
    const [imageName, setImageName] = useState<string | null>(null); // State to store the image name
    const navigation = useNavigation(); // Correctly get navigation

    useEffect(() => {
        const database = getDatabase();
        const user = auth.currentUser;

        if (user && user.email) {
            const userEmail = user.email;

            const usersRef = ref(database, 'users');
            const userQuery = query(usersRef, orderByChild('email'), equalTo(userEmail));

            get(userQuery)
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        snapshot.forEach((childSnapshot) => {
                            const userData = childSnapshot.val();
                            setUid(userData.name); // Assuming 'name' is the field for the UID
                        });
                    } else {
                        console.log('No user found with that email.');
                    }
                })
                .catch((error) => {
                    console.error('Error fetching user data:', error);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            console.log('No authenticated user.');
            setLoading(false);
        }
    }, []);

    const friendsPosts = [
        { id: 1, name: 'Mike Johnson', meal: 'Pancakes for breakfast', imageUrl: 'https://www.allrecipes.com/thmb/WqWggh6NwG-r8PoeA3OfW908FUY=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/21014-Good-old-Fashioned-Pancakes-mfs_001-1fa26bcdedc345f182537d95b6cf92d8.jpg' },
        { id: 2, name: 'Emily White', meal: 'Sushi for dinner', imageUrl: 'https://cdn.britannica.com/52/128652-050-14AD19CA/Maki-zushi.jpg' },
    ];

    // Function to open the camera and let the user take a picture
    const openCamera = async () => {
        // Request permission to access the camera
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'You need to grant camera permissions to take a photo.');
            return;
        }

        // Launch the camera
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            const imageUri = result.assets[0].uri;
            const imageName = imageUri.substring(imageUri.lastIndexOf('/') + 1); // Get the image name

            setImage(imageUri); // Store the image URI locally
            setImageName(imageName); // Store the image name

            // Upload the image to Firebase Storage
            uploadImage(imageUri, imageName);
        }
    };

    // Function to upload the image to Firebase Storage
    const uploadImage = async (uri: string, imageName: string) => {
        try {
            const storage = getStorage(); // Get Firebase storage instance
            const response = await fetch(uri);
            const blob = await response.blob();

            // Reference to Firebase Storage
            const storageReference = storageRef(storage, `images/${imageName}`);

            // Upload image to Firebase Storage
            await uploadBytes(storageReference, blob);

            // Get the download URL of the uploaded image
            const downloadURL = await getDownloadURL(storageReference);

            // Save the image URL and name in Firebase Database
            saveImageDetails(downloadURL, imageName);
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    };

    // Function to save image details in Firebase Realtime Database
    const saveImageDetails = async (downloadURL: string, imageName: string) => {
        const database = getDatabase();
        const user = auth.currentUser;

        if (user && user.email) {
            const userRef = ref(database, `users/${user.uid}/images`);

            // Store the image URL and image name in the database
            const newImageRef = ref(userRef, imageName);
            await set(newImageRef, {
                imageUrl: downloadURL,
                imageName: imageName
            });

            Alert.alert('Success', 'Image uploaded and saved successfully!');
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
            {/* Logo at the top */}
            <Image source={Logo} style={styles.logo} />

            {/* Scrollable View */}
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.welcomeText}>Time to Post {uid || 'Guest'}!</Text>

                {/* Pressable image to open the camera */}
                <TouchableOpacity onPress={openCamera}>
                    <Image source={upload} style={styles.uploadImage} />
                </TouchableOpacity>

                {/* Show the captured image if available */}
                {image && (
                    <Image source={{ uri: image }} style={styles.capturedImage} />
                )}

                {/* Friends' posts */}
                {friendsPosts.map(friend => (
                    <View key={friend.id} style={styles.friendCard}>
                        <Text style={styles.friendName}>{friend.name}</Text>
                        <Image
                            source={{ uri: friend.imageUrl }}
                            style={styles.mealImage}
                            resizeMode="cover"
                        />
                        <Text style={styles.mealText}>{friend.meal}</Text>
                    </View>
                ))}
            </ScrollView>

            {/* Bottom Navigation Bar */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
                    <Text style={styles.navText}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Main')}>
                    <Text style={styles.navText}>Main</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('AddFriends')}>
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
    uploadImage: {
        width: 50,
        height: 50,
        alignSelf: 'center',
        marginTop: -20,
    },
    capturedImage: {
        width: 200,
        height: 200,
        alignSelf: 'center',
        marginTop: 10,
        borderRadius: 10,
    },
    logo: {
        width: 100,
        height: 100,
        alignSelf: 'center',
        marginTop: -40,
        marginBottom: -20,
    },
    scrollContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    welcomeText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    friendCard: {
        backgroundColor: '#fff',
        padding: 20,
        marginBottom: 15,
        borderRadius: 10,
        shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 5,
                elevation: 3,
            },
            friendName: {
                fontSize: 16,
                fontWeight: 'bold',
                marginBottom: 5,
            },
            mealImage: {
                width: '100%',
                height: 150,
                borderRadius: 10,
                marginBottom: 10,
            },
            mealText: {
                fontSize: 14,
                color: '#333',
            },
            bottomNav: {
                flexDirection: 'row',
                justifyContent: 'space-around',
                backgroundColor: '#fff',
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: '#eee',
            },
            navItem: {
                alignItems: 'center',
            },
            navText: {
                fontSize: 14,
                color: '#333',
            },
        });

