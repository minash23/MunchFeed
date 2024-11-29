import React, { useState, useCallback } from 'react';  // Import necessary React hooks
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    ScrollView
} from 'react-native';  // Importing components from React Native
import { SafeAreaView } from 'react-native-safe-area-context';  // SafeAreaView for iOS screen padding
import { createUserWithEmailAndPassword } from 'firebase/auth';  // Import Firebase functions
import { getDatabase, ref, set, get } from 'firebase/database';  // Import Firebase Realtime Database functions
import { auth } from '../config/firebaseConfig';  // Import auth configuration
import { useNavigation } from '@react-navigation/native';  // Navigation hook from React Navigation
import debounce from 'lodash/debounce';  // Import lodash's debounce function for username check
import splash from '../assets/images/splash.png';  // Splash image import for branding

// Constants for form validation rules
const VALIDATION_RULES = {
    USERNAME: {
        pattern: /^[a-zA-Z0-9_]{3,20}$/,  // Username must be 3-20 characters long with alphanumeric characters and underscores
        message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
    },
    EMAIL: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,  // Simple email validation pattern
        message: 'Please enter a valid email address'
    },
    PASSWORD: {
        pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,  // Password should include letters, numbers, and special characters with at least 8 characters
        message: 'Password must be at least 8 characters and include letters, numbers, and special characters'
    },
    PHONE: {
        pattern: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,  // Basic phone number validation
        message: 'Please enter a valid phone number'
    }
};

// Custom input component for reusable form fields
const FormInput = ({
                       value,
                       onChangeText,
                       placeholder,
                       secureTextEntry,
                       keyboardType = 'default',
                       autoCapitalize = 'none',
                       error,
                       showPasswordToggle,
                       onTogglePassword,
                       style
                   }) => (
    <View style={styles.inputContainer}>
        <TextInput
            style={[
                styles.input,
                error && styles.inputError,  // Apply error styling if there's an error
                style
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#A9A9A9AC"  // Light grey placeholder color
            secureTextEntry={secureTextEntry}  // Option to hide/show password
            keyboardType={keyboardType}  // Customize keyboard type based on the field (e.g., email, phone)
            autoCapitalize={autoCapitalize}  // Prevent auto-capitalization for fields like email
            autoCorrect={false}  // Disable autocorrect
        />
        {showPasswordToggle && (
            <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={onTogglePassword}  // Toggle password visibility
            >
                <Text style={styles.showPasswordText}>
                    {secureTextEntry ? 'Show' : 'Hide'}  // Toggle text based on password visibility
                </Text>
            </TouchableOpacity>
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}  // Show error message if validation fails
    </View>
);

export default function SignupPage() {
    const [formData, setFormData] = useState({  // State to manage form input data
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        password: '',
        phoneNumber: ''
    });
    const [formErrors, setFormErrors] = useState({});  // State to manage form validation errors
    const [showPassword, setShowPassword] = useState(false);  // Toggle password visibility state
    const [isLoading, setIsLoading] = useState(false);  // State to manage loading state
    const navigation = useNavigation();  // Navigation hook for navigating between screens

    // Debounced function to check username availability
    const checkUsernameAvailability = useCallback(
        debounce(async (username) => {
            if (username && VALIDATION_RULES.USERNAME.pattern.test(username)) {
                const db = getDatabase();
                const usernameRef = ref(db, `usernames/${username.toLowerCase()}`);
                const snapshot = await get(usernameRef);  // Check if the username exists in the database
                if (snapshot.exists()) {
                    setFormErrors(prev => ({
                        ...prev,
                        username: 'Username is already taken'  // Show error if username is taken
                    }));
                }
            }
        }, 500),  // Delay the function call by 500ms to avoid too many requests
        []
    );

    // Validate individual fields based on validation rules
    const validateField = (name, value) => {
        let error = '';

        if (!value.trim()) {
            error = 'This field is required';  // Check if the field is empty
        } else {
            switch (name) {
                case 'username':
                    if (!VALIDATION_RULES.USERNAME.pattern.test(value)) {
                        error = VALIDATION_RULES.USERNAME.message;  // Check if username matches the regex pattern
                    }
                    break;
                case 'email':
                    if (!VALIDATION_RULES.EMAIL.pattern.test(value)) {
                        error = VALIDATION_RULES.EMAIL.message;  // Check if email matches the regex pattern
                    }
                    break;
                case 'password':
                    if (!VALIDATION_RULES.PASSWORD.pattern.test(value)) {
                        error = VALIDATION_RULES.PASSWORD.message;  // Check if password matches the regex pattern
                    }
                    break;
                case 'phoneNumber':
                    if (!VALIDATION_RULES.PHONE.pattern.test(value)) {
                        error = VALIDATION_RULES.PHONE.message;  // Check if phone number matches the regex pattern
                    }
                    break;
            }
        }

        return error;  // Return error message if validation fails
    };

    // Handle input field changes
    const handleInputChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));  // Update form data
        setFormErrors(prev => ({ ...prev, [name]: '' }));  // Clear previous error on input change
        const error = validateField(name, value);  // Validate the field
        if (error) {
            setFormErrors(prev => ({ ...prev, [name]: error }));  // Set the error if validation fails
        }
        if (name === 'username') {
            checkUsernameAvailability(value);  // Check username availability if the username field is changed
        }
    };

    // Validate the entire form before submitting
    const validateForm = () => {
        const errors = {};
        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key]);
            if (error) {
                errors[key] = error;  // Add error for invalid fields
            }
        });
        setFormErrors(errors);  // Set the form errors
        return Object.keys(errors).length === 0;  // Return true if no errors exist
    };

    // Handle form submission and sign up process
    const handleSignup = async () => {
        if (!validateForm()) {
            Alert.alert('Error', 'Please fix the errors in the form');  // Show alert if the form is invalid
            return;
        }

        setIsLoading(true);  // Set loading state to true while submitting the form
        try {
            // Create a new user with Firebase authentication
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );
            const user = userCredential.user;

            const db = getDatabase();
            const userData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                username: formData.username.toLowerCase(),
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                createdAt: new Date().toISOString()
            };

            // Save user data and username to the database
            await Promise.all([
                set(ref(db, `users/${user.uid}`), userData),
                set(ref(db, `usernames/${formData.username.toLowerCase()}`), user.uid)
            ]);

            // Reset form and errors after successful signup
            setFormData({
                firstName: '',
                lastName: '',
                username: '',
                email: '',
                password: '',
                phoneNumber: ''
            });
            setFormErrors({});

            navigation.navigate('Profile');  // Navigate to the Profile page after successful signup
        } catch (error) {
            const errorMessages = {
                'auth/email-already-in-use': 'This email is already registered',
                'auth/invalid-email': 'Invalid email address',
                'auth/weak-password': 'Password is too weak',
                'auth/network-request-failed': 'Network error. Please try again later',
            };
            const errorMessage = errorMessages[error.code] || 'Something went wrong. Please try again';
            Alert.alert('Signup Failed', errorMessage);  // Show error alert if signup fails
        } finally {
            setIsLoading(false);  // Set loading state to false after submission
        }
    };

    // Toggle the visibility of the password field
    const togglePasswordVisibility = () => {
        setShowPassword(prev => !prev);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}  // Adjust view for keyboard on iOS
                style={styles.keyboardAvoidingView}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>  // Dismiss keyboard on touch outside input
                    <ScrollView contentContainerStyle={styles.scrollView}>
                        <View style={styles.formContainer}>
                            <Image source={splash} style={styles.logo} />  // Display logo image

                            {/* First Name Input */}
                            <FormInput
                                value={formData.firstName}
                                onChangeText={(value) => handleInputChange('firstName', value)}
                                placeholder="First Name"
                                error={formErrors.firstName}
                            />

                            {/* Last Name Input */}
                            <FormInput
                                value={formData.lastName}
                                onChangeText={(value) => handleInputChange('lastName', value)}
                                placeholder="Last Name"
                                error={formErrors.lastName}
                            />

                            {/* Username Input */}
                            <FormInput
                                value={formData.username}
                                onChangeText={(value) => handleInputChange('username', value)}
                                placeholder="Username"
                                error={formErrors.username}
                            />

                            {/* Email Input */}
                            <FormInput
                                value={formData.email}
                                onChangeText={(value) => handleInputChange('email', value)}
                                placeholder="Email"
                                keyboardType="email-address"
                                error={formErrors.email}
                            />

                            {/* Password Input */}
                            <FormInput
                                value={formData.password}
                                onChangeText={(value) => handleInputChange('password', value)}
                                placeholder="Password"
                                secureTextEntry={!showPassword}
                                error={formErrors.password}
                                showPasswordToggle={true}
                                onTogglePassword={togglePasswordVisibility}
                            />

                            {/* Phone Number Input */}
                            <FormInput
                                value={formData.phoneNumber}
                                onChangeText={(value) => handleInputChange('phoneNumber', value)}
                                placeholder="Phone Number"
                                keyboardType="phone-pad"
                                error={formErrors.phoneNumber}
                            />

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleSignup}
                                disabled={isLoading}  // Disable button while loading
                            >
                                {isLoading ? (  // Show loader during the submission
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Sign Up</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Styles for the components
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollView: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    formContainer: {
        width: '100%',
        alignItems: 'center',
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 40,
    },
    inputContainer: {
        marginBottom: 15,
        width: '100%',
    },
    input: {
        width: '100%',
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
    },
    inputError: {
        borderColor: '#ff0000',  // Red border color if there's an error
    },
    errorText: {
        color: '#ff0000',
        fontSize: 12,
        marginTop: 5,
    },
    showPasswordButton: {
        position: 'absolute',
        right: 10,
        top: 10,
    },
    showPasswordText: {
        color: '#007BFF',
    },
    button: {
        backgroundColor: '#007BFF',
        padding: 15,
        borderRadius: 5,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
    },
});
