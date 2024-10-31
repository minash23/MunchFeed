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
    const [birthdayError, setBirthdayError] = useState('');
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

    const uploadProfileImage = async (uri: string) => {
        const user = auth.currentUser;
        if(!user) {
            return;
        }
        try {
            const imageRef = storageRef(storage, `profileImages/${user.uid}`);
            const response = await fetch(uri);
            const blob = await response.blob();
            await uploadBytes(imageRef, blob);
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

    const handleBirthdayChange = (text) => {
        const cleanedText = text.replace(/\D/g, '');
        let formattedDate = cleanedText;
        if (cleanedText.length >= 2) {
            formattedDate = cleanedText.slice(0, 2) + '/' + cleanedText.slice(2);
        }
        if (cleanedText.length >= 4) {
            formattedDate = formattedDate.slice(0, 5) + '/' + cleanedText.slice(4);
        }
        if (formattedDate.length <= 10) {
            setBirthday(formattedDate);
            if (cleanedText.length === 8) {
                const month = parseInt(cleanedText.slice(0, 2));
                const day = parseInt(cleanedText.slice(2, 4));
                const year = parseInt(cleanedText.slice(4, 8));
                const isValidMonth = month >= 1 && month <= 12;
                const isValidDay = day >= 1 && day <= 31;
                const isValidYear = year >= 1900 && year <= new Date().getFullYear();
                if (!isValidMonth) setBirthdayError('Invalid month');
                else if (!isValidDay) setBirthdayError('Invalid day');
                else if (!isValidYear) setBirthdayError('Invalid year');
                else setBirthdayError('');
            }
        }
    };

    const saveUserProfile = async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.error("User not authenticated");
                return;
            }

            let profileImageUrl = profileImage;
            if (profileImage && profileImage.startsWith('file://')) {
                const response = await fetch(profileImage);
                const blob = await response.blob();
                const imageRef = storageRef(storage, `profileImages/${user.uid}`);
                await uploadBytes(imageRef, blob);
                profileImageUrl = await getDownloadURL(imageRef);
            }

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
                profileImage: profileImageUrl
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

                        <Text style={styles.field}>Birthday (MM/DD/YYYY):</Text>
                        <TextInput
                            style={[styles.input, birthdayError ? styles.inputError : null]}
                            value={birthday}
                            onChangeText={handleBirthdayChange}
                            placeholder="MM/DD/YYYY"
                            keyboardType="numeric"
                            maxLength={10}
                        />
                        {birthdayError ? <Text style={styles.errorText}>{birthdayError}</Text> : null}
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
    inputError: {
        borderColor: 'red',
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginTop: -8,
        marginBottom: 10,
    },
});