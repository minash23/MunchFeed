import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../config/firebaseConfig';
import { getDatabase, ref, set, get, update } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigation } from '@react-navigation/native';

import Logo from '../assets/images/adaptive-icon.png';
import upload from '../assets/images/add.png';

export default function MainPage() {
    const [uid, setUid] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [image, setImage] = useState<string | null>(null);
    const [imageName, setImageName] = useState<string | null>(null);
    const navigation = useNavigation();

    useEffect(() => {
        const fetchUserData = async () => {
            const user = auth.currentUser;
            if (user) {
                setUid(user.uid);
                try {
                    const database = getDatabase();
                    const userRef = ref(database, `users/${user.uid}`);
                    const snapshot = await get(userRef);
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        setUserName(userData.name);
                    } else {
                        console.log('No user found with that UID.');
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            } else {
                console.log('No authenticated user.');
            }
            setLoading(false);
        };

        fetchUserData();
    }, []);

    const friendsPosts = [
        { id: 1, name: 'Mike Johnson', meal: 'Pancakes for breakfast', imageUrl: 'https://www.allrecipes.com/thmb/WqWggh6NwG-r8PoeA3OfW908FUY=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/21014-Good-old-Fashioned-Pancakes-mfs_001-1fa26bcdedc345f182537d95b6cf92d8.jpg' },
        { id: 2, name: 'Emily White', meal: 'Sushi for dinner', imageUrl: 'https://cdn.britannica.com/52/128652-050-14AD19CA/Maki-zushi.jpg' },
    ];

    const openCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'You need to grant camera permissions to take a photo.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const imageUri = result.assets[0].uri;
                const imageName = imageUri.substring(imageUri.lastIndexOf('/') + 1);

                setImage(imageUri);
                setImageName(imageName);

                await uploadImage(imageUri, imageName);
            }
        } catch (error) {
            console.error('Error opening camera: ', error);
            Alert.alert('An error occurred', 'Unable to open the camera.');
        }
    };

    const uploadImage = async (uri: string, imageName: string) => {
        try {
            const storage = getStorage();
            const response = await fetch(uri);
            const blob = await response.blob();

            const storageReference = storageRef(storage, `images/${imageName}`);
            await uploadBytes(storageReference, blob);

            const downloadURL = await getDownloadURL(storageReference);
            await saveImageDetails(downloadURL, imageName);
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert('Upload Failed', 'Failed to upload the image. Please try again.');
        }
    };

    const saveImageDetails = async (downloadURL: string, imageName: string) => {
        const database = getDatabase();
        const user = auth.currentUser;

        if (user && user.uid) {
            try {
                const userRef = ref(database, `users/${user.uid}`);

                // Create an update object with only the new image data
                const updateData = {
                    image: {
                        imageUrl: downloadURL,
                        imageName: imageName,
                        timestamp: Date.now()
                    }
                };

                // Update the user's data with the new image information
                await update(userRef, updateData);

                Alert.alert('Success', 'Image uploaded and saved successfully!');
            } catch (error) {
                console.error('Error saving image details:', error);
                Alert.alert('Save Failed', 'Failed to save image details. Please try again.');
            }
        } else {
            Alert.alert('Error', 'User not authenticated.');
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
            <Image source={Logo} style={styles.logo} />
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.welcomeText}>Time to Post {userName || 'Guest'}!</Text>
                <TouchableOpacity onPress={openCamera}>
                    <Image source={upload} style={styles.uploadImage} />
                </TouchableOpacity>
                {image && (
                    <Image source={{ uri: image }} style={styles.capturedImage} />
                )}
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
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile' as never)}>
                    <Text style={styles.navText}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Main' as never)}>
                    <Text style={styles.navText}>Main</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('AddFriends' as never)}>
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
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 10,
    },
    mealImage: {
        width: '100%',
        height: 150,
        borderRadius: 10,
    },
    mealText: {
        marginTop: 5,
        fontSize: 14,
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderColor: '#ccc',
    },
    navItem: {
        padding: 10,
    },
    navText: {
        fontSize: 16,
    },
});