import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set, get } from 'firebase/database';
import { auth } from '../config/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import debounce from 'lodash/debounce';
// @ts-ignore
import splash from '../assets/images/splash.png';

// Form validation constants for different fields
const VALIDATION_RULES = {
    USERNAME: {
        pattern: /^[a-zA-Z0-9_]{3,20}$/, // Username must be 3-20 characters, letters, numbers, or underscores
        message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
    },
    EMAIL: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Valid email regex
        message: 'Please enter a valid email address'
    },
    PASSWORD: {
        pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/, // Password must contain letters, numbers, and special chars
        message: 'Password must be at least 8 characters and include letters, numbers, and special characters'
    },
    PHONE: {
        pattern: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/, // Valid phone number regex
        message: 'Please enter a valid phone number'
    }
};

// Custom reusable input component
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
                error && styles.inputError,
                style
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#A9A9A9AC"
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
        />
        {showPasswordToggle && (
            <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={onTogglePassword}
            >
                <Text style={styles.showPasswordText}>
                    {secureTextEntry ? 'Show' : 'Hide'} // Toggles password visibility
                </Text>
            </TouchableOpacity>
        )}
        {error && <Text style={styles.errorText}>{error}</Text>} // Shows error message if validation fails
    </View>
);

export default function SignupPage() {
    // State to store form data
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        password: '',
        phoneNumber: ''
    });

    // State to store form field errors
    const [formErrors, setFormErrors] = useState({});
    // State for password visibility toggle
    const [showPassword, setShowPassword] = useState(false);
    // State to manage loading state while signing up
    const [isLoading, setIsLoading] = useState(false);
    // Navigation hook for navigating between screens
    const navigation = useNavigation();

    // Debounced function to check username availability in the database
    const checkUsernameAvailability = useCallback(
        debounce(async (username) => {
            if (username && VALIDATION_RULES.USERNAME.pattern.test(username)) {
                const db = getDatabase();
                const usernameRef = ref(db, `usernames/${username.toLowerCase()}`);
                const snapshot = await get(usernameRef);
                if (snapshot.exists()) {
                    setFormErrors(prev => ({
                        ...prev,
                        username: 'Username is already taken' // Shows error if username is taken
                    }));
                }
            }
        }, 500), // Debounce delay of 500ms
        []
    );

    // Field validation function based on rules
    const validateField = (name, value) => {
        let error = '';

        if (!value.trim()) {
            error = 'This field is required'; // Checks if field is empty
        } else {
            switch (name) {
                case 'username':
                    if (!VALIDATION_RULES.USERNAME.pattern.test(value)) {
                        error = VALIDATION_RULES.USERNAME.message; // Validates username
                    }
                    break;
                case 'email':
                    if (!VALIDATION_RULES.EMAIL.pattern.test(value)) {
                        error = VALIDATION_RULES.EMAIL.message; // Validates email
                    }
                    break;
                case 'password':
                    if (!VALIDATION_RULES.PASSWORD.pattern.test(value)) {
                        error = VALIDATION_RULES.PASSWORD.message; // Validates password
                    }
                    break;
                case 'phoneNumber':
                    if (!VALIDATION_RULES.PHONE.pattern.test(value)) {
                        error = VALIDATION_RULES.PHONE.message; // Validates phone number
                    }
                    break;
            }
        }

        return error;
    };

    // Handles input change and validates the specific field
    const handleInputChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clears previous error when user starts typing
        setFormErrors(prev => ({ ...prev, [name]: '' }));

        // Validate field on change
        const error = validateField(name, value);
        if (error) {
            setFormErrors(prev => ({ ...prev, [name]: error }));
        }

        // Check username availability only when username is being updated
        if (name === 'username') {
            checkUsernameAvailability(value);
        }
    };

    // Validates all form fields
    const validateForm = () => {
        const errors = {};
        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key]);
            if (error) {
                errors[key] = error;
            }
        });
        setFormErrors(errors); // Update form errors state
        return Object.keys(errors).length === 0; // Return true if no errors
    };

    // Handles form submission and user signup
    const handleSignup = async () => {
        if (!validateForm()) {
            Alert.alert('Error', 'Please fix the errors in the form'); // Show alert if form is invalid
            return;
        }

        setIsLoading(true); // Set loading state to true while signing up
        try {
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

            // Atomic operation to add user data to the database
            await Promise.all([
                set(ref(db, `users/${user.uid}`), userData),
                set(ref(db, `usernames/${formData.username.toLowerCase()}`), user.uid) // Reserve username
            ]);

            // Reset form after successful signup
            setFormData({
                firstName: '',
                lastName: '',
                username: '',
                email: '',
                password: '',
                phoneNumber: ''
            });
            setFormErrors({});

            navigation.navigate('Profile'); // Navigate to the Profile screen after successful signup
        } catch (error) {
            // Show specific error messages based on Firebase error codes
            const errorMessages = {
                'auth/email-already-in-use': 'This email is already registered',
                'auth/invalid-email': 'Invalid email address',
                'auth/weak-password': 'Password is too weak',
                'auth/network-request-failed': 'Network error. Please check your connection'
            };

            Alert.alert(
                'Signup Error',
                errorMessages[error.code] || 'An error occurred during signup' // Default error message
            );
        } finally {
            setIsLoading(false); // Set loading state to false after the operation is complete
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? -64 : 0}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <SafeAreaView style={styles.container}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        <View style={styles.contentWrapper}>
                            <View style={styles.imageContainer}>
                                <Image
                                    source={splash}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                            </View>

                            <View style={styles.formContainer}>
                                <Text style={styles.title}>Create Account</Text>

                                {/* First Name Input */}
                                <FormInput
                                    value={formData.firstName}
                                    onChangeText={text => handleInputChange('firstName', text)}
                                    placeholder="First Name"
                                    error={formErrors.firstName}
                                />

                                {/* Last Name Input */}
                                <FormInput
                                    value={formData.lastName}
                                    onChangeText={text => handleInputChange('lastName', text)}
                                    placeholder="Last Name"
                                    error={formErrors.lastName}
                                />

                                {/* Username Input */}
                                <FormInput
                                    value={formData.username}
                                    onChangeText={text => handleInputChange('username', text)}
                                    placeholder="Username"
                                    error={formErrors.username}
                                />

                                {/* Email Input */}
                                <FormInput
                                    value={formData.email}
                                    onChangeText={text => handleInputChange('email', text)}
                                    placeholder="Email"
                                    error={formErrors.email}
                                    keyboardType="email-address"
                                />

                                {/* Phone Number Input */}
                                <FormInput
                                    value={formData.phoneNumber}
                                    onChangeText={text => handleInputChange('phoneNumber', text)}
                                    placeholder="Phone Number"
                                    error={formErrors.phoneNumber}
                                    keyboardType="phone-pad"
                                />

                                {/* Password Input */}
                                <FormInput
                                    value={formData.password}
                                    onChangeText={text => handleInputChange('password', text)}
                                    placeholder="Password"
                                    secureTextEntry={!showPassword}
                                    error={formErrors.password}
                                    showPasswordToggle
                                    onTogglePassword={() => setShowPassword(prev => !prev)}
                                />

                                {/* Sign Up Button */}
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={handleSignup}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator size="small" color="#fff" /> // Show loading spinner while signing up
                                    ) : (
                                        <Text style={styles.buttonText}>Sign Up</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    scrollContent: {
        flexGrow: 1,
    },
    contentWrapper: {
        flex: 1,
        paddingBottom: 20,
    },
    imageContainer: {
        alignItems: 'center',
        position: 'relative',
        bottom: 75,
        marginBottom: -100,
    },
    logo: {
        width: 400,
        height: 400,
    },
    formContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    title: {
        fontFamily: 'Trebuchet MS',
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Trebuchet MS',
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
    },
    nameRow: {
        flexDirection: 'row',
        marginBottom: 15,
        width: '100%',
    },
    nameInput: {
        flex: 1,
    },
    lastNameInput: {
        marginLeft: 10,
    },
    inputContainer: {
        marginBottom: 15,
        position: 'relative',
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
        width: '100%',
    },
    inputError: {
        borderColor: '#ff6b6b',
    },
    errorText: {
        color: '#ff6b6b',
        fontSize: 12,
        marginTop: 4,
        fontFamily: 'Trebuchet MS',
    },
    showPasswordButton: {
        position: 'absolute',
        right: 15,
        top: 12,
    },
    showPasswordText: {
        color: '#007AFF',
        fontSize: 14,
        fontFamily: 'Trebuchet MS',
    },
    button: {
        height: 45,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    signupButton: {
        backgroundColor: '#007AFF',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Trebuchet MS',
        fontWeight: '600',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 15,
    },
    loginText: {
        color: '#666',
        fontSize: 14,
        fontFamily: 'Trebuchet MS',
    },
    loginLink: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Trebuchet MS',
    },
});