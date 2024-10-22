import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Image, SafeAreaView, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { auth, database, storage } from '../config/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { ref, get, set } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigation } from '@react-navigation/native';

export default function ProfilePage() {
    const [profileImage, setProfileImage] = useState(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [foodPreference, setFoodPreference] = useState('');
    const [location, setLocation] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [birthday, setBirthday] = useState('');
    const navigation = useNavigation();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const user = auth.currentUser;
                if (user) {
                    const userRef = ref(database, 'users/' + user.uid);
                    const snapshot = await get(userRef);
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        setUsername(userData.username || '');
                        setFirstName(userData.firstName || '');
                        setLastName(userData.lastName || '');
                        setFoodPreference(userData.foodPreference || '');
                        setLocation(userData.location || '');
                        setEmail(userData.email || '');
                        setPhoneNumber(userData.phoneNumber || '');
                        setBirthday(userData.birthday || '');
                        setProfileImage(userData.profileImage || null);
                    } else {
                        console.log("No data available");
                    }
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };

        fetchUserData();
    }, []);

    const uploadProfileImage = async (uri: string) =>{
        const user = auth.currentUser;
        if(!user) {
            return;
        }
        try {
            // create reference for firebase storage
            const imageRef = storageRef(storage, `profileImages/${user.uid}`);
            //convert local to blob
            const response = await fetch(uri);
            const blob = await response.blob();
            //upload image
            await uploadBytes(imageRef, blob);

            //downloadURL
            const downloadURL = await getDownloadURL(imageRef);

            return downloadURL;
        }
        catch (error) {
            console.error("Error uploading image:", error);
            return null;
        }
    }

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled && result.assets[0].fileSize <= 5000000) {
            const uploadedURL = await uploadProfileImage(result.assets[0].uri)
            if(uploadedURL) {
                setProfileImage(uploadedURL);
            }
        } else {
            alert('Please select a JPG or PNG image smaller than 5 MB.');
        }
    };

    const saveUserProfile = async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.error("User not authenticated");
                return;
            }


            let profileImageUrl = profileImage; // This holds the URL that will be saved in the database
            if (profileImage && profileImage.startsWith('file://')) {
                // Only upload if a new local image has been selected
                const response = await fetch(profileImage); // Fetch the image from the local file system
                const blob = await response.blob(); // Convert it to a blob for Firebase upload

                // Reference for storage location
                const imageRef = storageRef(storage, `profileImages/${user.uid}`); // Storage path for the user's profile image
                await uploadBytes(imageRef, blob); // Upload the image to Firebase Storage

                // Get the downloadable URL for the uploaded image
                profileImageUrl = await getDownloadURL(imageRef);
            }

            // Save the user data, including the profileImageUrl, to Firebase Realtime Database
            const userRef = ref(database, 'users/' + user.uid);
            await set(userRef, {
                username,
                firstName,
                lastName,
                foodPreference,
                location,
                email,
                phoneNumber,
                birthday,
                profileImage: profileImageUrl // Save the URL instead of the local path
            });

            alert('Profile Saved!');
            navigation.navigate('Main');
        } catch (error) {
            console.error("Error saving user data:", error);
            alert('Failed to save profile. Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <View style={styles.profileContainer}>
                    <TouchableOpacity onPress={pickImage} style={styles.imageUpload}>
                        {profileImage ? (
                            <Image source={{ uri: profileImage }} style={styles.profileImage} />
                        ) : (
                            <Text style={styles.imagePlaceholder}>Upload New Image</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.detailsContainer}>
                        <Text style={styles.label}>Account Details:</Text>

                        <Text style={styles.field}>Username:</Text>
                        <TextInput style={styles.input} value={username} onChangeText={setUsername} />

                        <Text style={styles.field}>First Name:</Text>
                        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

                        <Text style={styles.field}>Last Name:</Text>
                        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />

                        <Text style={styles.field}>Food Preference:</Text>
                        <TextInput style={styles.input} value={foodPreference} onChangeText={setFoodPreference} />

                        <Text style={styles.field}>Location:</Text>
                        <TextInput style={styles.input} value={location} onChangeText={setLocation} />

                        <Text style={styles.field}>Email:</Text>
                        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

                        <Text style={styles.field}>Phone Number:</Text>
                        <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />

                        <Text style={styles.field}>Birthday:</Text>
                        <TextInput style={styles.input} value={birthday} onChangeText={setBirthday} />
                    </View>

                    <Button title="SAVE" onPress={saveUserProfile} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollViewContent: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    profileContainer: {
        width: '100%',
        alignItems: 'center',
    },
    imageUpload: {
        backgroundColor: '#ddd',
        width: 150,
        height: 150,
        borderRadius: 75,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    profileImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
    },
    imagePlaceholder: {
        color: '#888',
        textAlign: 'center',
    },
    detailsContainer: {
        width: '100%',
        padding: 10,
    },
    label: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    field: {
        fontSize: 16,
        marginTop: 10,
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
});
