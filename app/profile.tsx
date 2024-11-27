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

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export default function ProfilePage() {
    const [formData, setFormData] = useState({
        profileImage: null,
        firstName: '',
        lastName: '',
        username: '',
        foodPreference: '',
        location: '',
        email: '',
        phoneNumber: '',
        birthday: ''
    });

    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const navigation = useNavigation();

    useEffect(() => {
        requestImagePermissions();
        fetchUserData();
    }, []);

    const requestImagePermissions = async () => {
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
            }
        }
    };

    const fetchUserData = async () => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('No authenticated user found');

            const snapshot = await get(ref(database, `users/${user.uid}`));
            if (snapshot.exists()) {
                const userData = snapshot.val();
                setFormData(prevData => ({
                    ...prevData,
                    ...userData,
                    email: userData.email || user.email || ''
                }));
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load profile data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const validateForm = () => {
        const newErrors = {};

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Phone validation (optional but must be valid if provided)
        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        if (formData.phoneNumber && !phoneRegex.test(formData.phoneNumber)) {
            newErrors.phoneNumber = 'Please enter a valid phone number';
        }

        // Birthday validation
        if (formData.birthday) {
            const [month, day, year] = formData.birthday.split('/').map(Number);
            const birthDate = new Date(year, month - 1, day);
            const today = new Date();

            if (
                month < 1 || month > 12 ||
                day < 1 || day > 31 ||
                year < 1900 || year > today.getFullYear() ||
                birthDate > today
            ) {
                newErrors.birthday = 'Please enter a valid birth date';
            }
        }

        // Required fields
        ['username', 'firstName', 'lastName'].forEach(field => {
            if (!formData[field]?.trim()) {
                newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const formatBirthday = (text) => {
        const cleaned = text.replace(/\D/g, '');
        let formatted = cleaned;

        if (cleaned.length >= 2) {
            formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
        }
        if (cleaned.length >= 4) {
            formatted = formatted.slice(0, 5) + '/' + cleaned.slice(4);
        }

        return formatted.slice(0, 10);
    };

    const handleBirthdayChange = (text) => {
        const formatted = formatBirthday(text);
        handleInputChange('birthday', formatted);
    };

    const pickImage = async () => {
        try {
            setIsUploadingImage(true);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const { uri, fileSize } = result.assets[0];

                if (fileSize && fileSize > MAX_IMAGE_SIZE) {
                    throw new Error('Image size must be less than 5MB');
                }

                const uploadedURL = await uploadProfileImage(uri);
                if (uploadedURL) {
                    handleInputChange('profileImage', uploadedURL);
                }
            }
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to upload image. Please try again.');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const uploadProfileImage = async (uri) => {
        const user = auth.currentUser;
        if (!user) return null;

        try {
            const imageRef = storageRef(storage, `profileImages/${user.uid}`);
            const response = await fetch(uri);
            const blob = await response.blob();
            await uploadBytes(imageRef, blob);
            return await getDownloadURL(imageRef);
        } catch (error) {
            throw new Error('Failed to upload image');
        }
    };

    const saveUserProfile = async () => {
        if (!validateForm()) {
            Alert.alert('Validation Error', 'Please correct the errors in the form.');
            return;
        }

        setIsSaving(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('No authenticated user found');

            await set(ref(database, `users/${user.uid}`), {
                ...formData,
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

    const renderField = (label, field, props = {}) => (
        <View style={styles.fieldContainer}>
            <Text style={styles.field}>{label}</Text>
            <TextInput
                style={[styles.input, errors[field] && styles.inputError]}
                value={formData[field]}
                onChangeText={(text) => handleInputChange(field, text)}
                {...props}
            />
            {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
        </View>
    );

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
                            ) : formData.profileImage ? (
                                <Image
                                    source={{ uri: formData.profileImage }}
                                    style={styles.profileImage}
                                />
                            ) : (
                                <View style={styles.placeholderContainer}>
                                    <Text style={styles.imagePlaceholder}>Upload Photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.detailsContainer}>
                            <Text style={styles.label}>Account Details</Text>

                            {renderField('Username *', 'username', {
                                placeholder: 'Enter username',
                                autoCapitalize: 'none'
                            })}
                            {renderField('First Name *', 'firstName', {
                                placeholder: 'Enter first name'
                            })}
                            {renderField('Last Name *', 'lastName', {
                                placeholder: 'Enter last name'
                            })}
                            {renderField('Food Preference', 'foodPreference', {
                                placeholder: 'Enter food preference'
                            })}
                            {renderField('Location', 'location', {
                                placeholder: 'Enter location'
                            })}
                            {renderField('Email *', 'email', {
                                placeholder: 'Enter email',
                                keyboardType: 'email-address',
                                autoCapitalize: 'none'
                            })}
                            {renderField('Phone Number', 'phoneNumber', {
                                placeholder: 'Enter phone number',
                                keyboardType: 'phone-pad'
                            })}
                            {renderField('Birthday (MM/DD/YYYY)', 'birthday', {
                                placeholder: 'MM/DD/YYYY',
                                keyboardType: 'numeric',
                                maxLength: 10,
                                onChangeText: handleBirthdayChange
                            })}
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
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
    fieldContainer: {
        marginBottom: 15,
    },
    label: {
        fontSize: 22,
        fontWeight: 'bold',
        fontFamily: Platform.select({ ios: 'Trebuchet MS', android: 'Roboto' }),
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    field: {
        fontSize: 16,
        fontFamily: Platform.select({ ios: 'Trebuchet MS', android: 'Roboto' }),
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
        fontFamily: Platform.select({ ios: 'Trebuchet MS', android: 'Roboto' }),
        backgroundColor: '#f8f8f8',
    },
    inputError: {
        borderColor: '#ff3b30',
    },
    errorText: {
        color: '#ff3b30',
        fontSize: 12,
        fontFamily: Platform.select({ ios: 'Trebuchet MS', android: 'Roboto' }),
        marginTop: 4,
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
    saveButtonDisabled: {
        backgroundColor: '#007AFF80',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: Platform.select({ ios: 'Trebuchet MS', android: 'Roboto' }),
        fontWeight: '600',
    },
});