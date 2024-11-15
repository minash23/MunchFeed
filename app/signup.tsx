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

// Form validation constants
const VALIDATION_RULES = {
    USERNAME: {
        pattern: /^[a-zA-Z0-9_]{3,20}$/,
        message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
    },
    EMAIL: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Please enter a valid email address'
    },
    PASSWORD: {
        pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
        message: 'Password must be at least 8 characters and include letters, numbers, and special characters'
    },
    PHONE: {
        pattern: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
        message: 'Please enter a valid phone number'
    }
};

// Custom input component for reusability
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
                    {secureTextEntry ? 'Show' : 'Hide'}
                </Text>
            </TouchableOpacity>
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

export default function SignupPage() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        password: '',
        phoneNumber: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigation = useNavigation();

    // Debounced username availability check
    const checkUsernameAvailability = useCallback(
        debounce(async (username) => {
            if (username && VALIDATION_RULES.USERNAME.pattern.test(username)) {
                const db = getDatabase();
                const usernameRef = ref(db, `usernames/${username.toLowerCase()}`);
                const snapshot = await get(usernameRef);
                if (snapshot.exists()) {
                    setFormErrors(prev => ({
                        ...prev,
                        username: 'Username is already taken'
                    }));
                }
            }
        }, 500),
        []
    );

    const validateField = (name, value) => {
        let error = '';

        if (!value.trim()) {
            error = 'This field is required';
        } else {
            switch (name) {
                case 'username':
                    if (!VALIDATION_RULES.USERNAME.pattern.test(value)) {
                        error = VALIDATION_RULES.USERNAME.message;
                    }
                    break;
                case 'email':
                    if (!VALIDATION_RULES.EMAIL.pattern.test(value)) {
                        error = VALIDATION_RULES.EMAIL.message;
                    }
                    break;
                case 'password':
                    if (!VALIDATION_RULES.PASSWORD.pattern.test(value)) {
                        error = VALIDATION_RULES.PASSWORD.message;
                    }
                    break;
                case 'phoneNumber':
                    if (!VALIDATION_RULES.PHONE.pattern.test(value)) {
                        error = VALIDATION_RULES.PHONE.message;
                    }
                    break;
            }
        }

        return error;
    };

    const handleInputChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear previous error when user starts typing
        setFormErrors(prev => ({ ...prev, [name]: '' }));

        // Validate field on change
        const error = validateField(name, value);
        if (error) {
            setFormErrors(prev => ({ ...prev, [name]: error }));
        }

        // Check username availability
        if (name === 'username') {
            checkUsernameAvailability(value);
        }
    };

    const validateForm = () => {
        const errors = {};
        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key]);
            if (error) {
                errors[key] = error;
            }
        });
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSignup = async () => {
        if (!validateForm()) {
            Alert.alert('Error', 'Please fix the errors in the form');
            return;
        }

        setIsLoading(true);
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

            // Use a transaction to ensure atomicity
            await Promise.all([
                set(ref(db, `users/${user.uid}`), userData),
                set(ref(db, `usernames/${formData.username.toLowerCase()}`), user.uid)
            ]);

            // Reset form
            setFormData({
                firstName: '',
                lastName: '',
                username: '',
                email: '',
                password: '',
                phoneNumber: ''
            });
            setFormErrors({});

            navigation.navigate('Profile');
        } catch (error) {
            const errorMessages = {
                'auth/email-already-in-use': 'This email is already registered',
                'auth/invalid-email': 'Invalid email address',
                'auth/weak-password': 'Password is too weak',
                'auth/network-request-failed': 'Network error. Please check your connection'
            };

            Alert.alert(
                'Signup Error',
                errorMessages[error.code] || 'An error occurred during signup'
            );
        } finally {
            setIsLoading(false);
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
                                <Text style={styles.subtitle}>Sign up to get started</Text>

                                <View style={styles.nameRow}>
                                    <FormInput
                                        value={formData.firstName}
                                        onChangeText={(value) => handleInputChange('firstName', value)}
                                        placeholder="First Name"
                                        autoCapitalize="words"
                                        error={formErrors.firstName}
                                        style={styles.nameInput}
                                    />
                                    <FormInput
                                        value={formData.lastName}
                                        onChangeText={(value) => handleInputChange('lastName', value)}
                                        placeholder="Last Name"
                                        autoCapitalize="words"
                                        error={formErrors.lastName}
                                        style={[styles.nameInput, styles.lastNameInput]}
                                    />
                                </View>

                                <FormInput
                                    value={formData.username}
                                    onChangeText={(value) => handleInputChange('username', value.toLowerCase())}
                                    placeholder="Username"
                                    error={formErrors.username}
                                />

                                <FormInput
                                    value={formData.email}
                                    onChangeText={(value) => handleInputChange('email', value)}
                                    placeholder="Email"
                                    keyboardType="email-address"
                                    error={formErrors.email}
                                />

                                <FormInput
                                    value={formData.password}
                                    onChangeText={(value) => handleInputChange('password', value)}
                                    placeholder="Password"
                                    secureTextEntry={!showPassword}
                                    error={formErrors.password}
                                    showPasswordToggle
                                    onTogglePassword={() => setShowPassword(!showPassword)}
                                />

                                <FormInput
                                    value={formData.phoneNumber}
                                    onChangeText={(value) => handleInputChange('phoneNumber', value)}
                                    placeholder="Phone Number"
                                    keyboardType="phone-pad"
                                    error={formErrors.phoneNumber}
                                />

                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        styles.signupButton,
                                        isLoading && styles.buttonDisabled
                                    ]}
                                    onPress={handleSignup}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.buttonText}>Sign Up</Text>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.loginContainer}>
                                    <Text style={styles.loginText}>Already have an account? </Text>
                                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                        <Text style={styles.loginLink}>Log In</Text>
                                    </TouchableOpacity>
                                </View>
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