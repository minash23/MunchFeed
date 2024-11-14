import React, { useState } from 'react';
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
// @ts-ignore
import splash from '../assets/images/splash.png';

export default function SignupPage() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigation = useNavigation();

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password) => {
        return password.length >= 6;
    };

    const validatePhoneNumber = (number) => {
        const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        return phoneRegex.test(number);
    };

    const validateUsername = (username) => {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    };

    const handleSignup = async () => {
        if (firstName.trim() === '' || lastName.trim() === '' || username.trim() === '' ||
            email.trim() === '' || password === '' || phoneNumber.trim() === '') {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (!validateUsername(username)) {
            Alert.alert('Error', 'Username must be 3-20 characters long and can only contain letters, numbers, and underscores');
            return;
        }

        if (!validateEmail(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        if (!validatePassword(password)) {
            Alert.alert('Error', 'Password must be at least 6 characters long');
            return;
        }

        if (!validatePhoneNumber(phoneNumber)) {
            Alert.alert('Error', 'Please enter a valid phone number');
            return;
        }

        setIsLoading(true);
        try {
            // Check if username is already taken
            const db = getDatabase();
            const usernameRef = ref(db, `usernames/${username.toLowerCase()}`);
            const usernameSnapshot = await get(usernameRef);

            if (usernameSnapshot.exists()) {
                Alert.alert('Error', 'This username is already taken');
                setIsLoading(false);
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Save user data
            await set(ref(db, 'users/' + user.uid), {
                firstName: firstName,
                lastName: lastName,
                username: username.toLowerCase(),
                email: email,
                phoneNumber: phoneNumber,
                createdAt: new Date().toISOString()
            });

            // Reserve username
            await set(ref(db, `usernames/${username.toLowerCase()}`), user.uid);

            setFirstName('');
            setLastName('');
            setUsername('');
            setEmail('');
            setPassword('');
            setPhoneNumber('');

            navigation.navigate('Profile');
        } catch (error) {
            let errorMessage = 'An error occurred during signup';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'This email is already registered';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection';
                    break;
            }
            Alert.alert('Signup Error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = () => {
        navigation.navigate('Login');
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
                                    <View style={styles.nameInput}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="First Name"
                                            placeholderTextColor={'#A9A9A9AC'}
                                            value={firstName}
                                            onChangeText={setFirstName}
                                            autoCorrect={false}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                    <View style={[styles.nameInput, styles.lastNameInput]}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Last Name"
                                            placeholderTextColor={'#A9A9A9AC'}
                                            value={lastName}
                                            onChangeText={setLastName}
                                            autoCorrect={false}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Username"
                                        placeholderTextColor={'#A9A9A9AC'}
                                        value={username}
                                        onChangeText={(text) => setUsername(text.toLowerCase())}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Email"
                                        placeholderTextColor={'#A9A9A9AC'}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Password"
                                        placeholderTextColor={'#A9A9A9AC'}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity
                                        style={styles.showPasswordButton}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Text style={styles.showPasswordText}>
                                            {showPassword ? 'Hide' : 'Show'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Phone Number"
                                        placeholderTextColor={'#A9A9A9AC'}
                                        value={phoneNumber}
                                        onChangeText={setPhoneNumber}
                                        keyboardType="phone-pad"
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.button, styles.signupButton]}
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
                                    <TouchableOpacity onPress={handleLogin}>
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
    },
    loginLink: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Trebuchet MS',
    },
});

