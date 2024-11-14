import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Image,
    SafeAreaView,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    KeyboardAvoidingView
} from 'react-native';
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
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
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
                        setEmail(userData.email || user.email || '');
                        setPhoneNumber(userData.phoneNumber || '');
                        setBirthday(userData.birthday || '');
                        setProfileImage(userData.profileImage || null);
                    }
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to load profile data. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const uploadProfileImage = async (uri) => {
        const user = auth.currentUser;
        if(!user) return null;

        try {
            const imageRef = storageRef(storage, `profileImages/${user.uid}`);
            const response = await fetch(uri);
            const blob = await response.blob();
            await uploadBytes(imageRef, blob);
            const downloadURL = await getDownloadURL(imageRef);
            return downloadURL;
        } catch (error) {
            Alert.alert('Error', 'Failed to upload image. Please try again.');
            return null;
        }
    };

    const pickImage = async () => {
        try {
            setIsUploadingImage(true);
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (!result.canceled) {
                if (result.assets[0].fileSize <= 5000000) {
                    const uploadedURL = await uploadProfileImage(result.assets[0].uri);
                    if(uploadedURL) {
                        setProfileImage(uploadedURL);
                    }
                } else {
                    Alert.alert('Error', 'Please select an image smaller than 5 MB.');
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to select image. Please try again.');
        } finally {
            setIsUploadingImage(false);
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

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const saveUserProfile = async () => {
        if (!validateEmail(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        setIsSaving(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("User not authenticated");
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
                profileImage: profileImageUrl,
                updatedAt: new Date().toISOString()
            });

            Alert.alert('Success', 'Profile saved successfully!', [
                { text: 'OK', onPress: () => navigation.navigate('Main') }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to save profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollViewContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.profileContainer}>
                        <TouchableOpacity
                            onPress={pickImage}
                            style={styles.imageUpload}
                            disabled={isUploadingImage}
                        >
                            {isUploadingImage ? (
                                <ActivityIndicator size="small" color="#007AFF" />
                            ) : profileImage ? (
                                <Image source={{ uri: profileImage }} style={styles.profileImage} />
                            ) : (
                                <View style={styles.placeholderContainer}>
                                    <Text style={styles.imagePlaceholder}>Upload Photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.detailsContainer}>
                            <Text style={styles.label}>Account Details</Text>

                            <Text style={styles.field}>Username</Text>
                            <TextInput
                                style={styles.input}
                                value={username}
                                onChangeText={setUsername}
                                placeholder="Enter username"
                            />

                            <Text style={styles.field}>First Name</Text>
                            <TextInput
                                style={styles.input}
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="Enter first name"
                            />

                            <Text style={styles.field}>Last Name</Text>
                            <TextInput
                                style={styles.input}
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="Enter last name"
                            />

                            <Text style={styles.field}>Food Preference</Text>
                            <TextInput
                                style={styles.input}
                                value={foodPreference}
                                onChangeText={setFoodPreference}
                                placeholder="Enter food preference"
                            />

                            <Text style={styles.field}>Location</Text>
                            <TextInput
                                style={styles.input}
                                value={location}
                                onChangeText={setLocation}
                                placeholder="Enter location"
                            />

                            <Text style={styles.field}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholder="Enter email"
                            />

                            <Text style={styles.field}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                keyboardType="phone-pad"
                                placeholder="Enter phone number"
                            />

                            <Text style={styles.field}>Birthday (MM/DD/YYYY)</Text>
                            <TextInput
                                style={[styles.input, birthdayError ? styles.inputError : null]}
                                value={birthday}
                                onChangeText={handleBirthdayChange}
                                placeholder="MM/DD/YYYY"
                                keyboardType="numeric"
                                maxLength={10}
                            />
                            {birthdayError ? (
                                <Text style={styles.errorText}>{birthdayError}</Text>
                            ) : null}
                        </View>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={saveUserProfile}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Profile</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    scrollViewContent: {
        paddingVertical: 20,
    },
    profileContainer: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    imageUpload: {
        backgroundColor: '#f8f8f8',
        width: 150,
        height: 150,
        borderRadius: 75,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    profileImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
    },
    placeholderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    imagePlaceholder: {
        color: '#007AFF',
        fontSize: 16,
        textAlign: 'center',
    },
    detailsContainer: {
        width: '100%',
        marginBottom: 20,
    },
    label: {
        fontSize: 22,
        fontWeight: 'bold',
        fontFamily: 'Trebuchet MS',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    field: {
        fontSize: 16,
        fontFamily: 'Trebuchet MS',
        color: '#666',
        marginBottom: 8,
    },
    input: {
        height: 45,
        borderColor: '#e1e1e1',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        fontFamily: 'Trebuchet MS',
        backgroundColor: '#f8f8f8',
        marginBottom: 15,
    },
    inputError: {
        borderColor: '#ff3b30',
    },
    errorText: {
        color: '#ff3b30',
        fontSize: 12,
        marginTop: -12,
        marginBottom: 15,
    },
    saveButton: {
        backgroundColor: '#007AFF',
        width: '100%',
        height: 45,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});