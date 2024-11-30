import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import splash from '../assets/images/splash.png';

// Get screen dimensions for responsive layout
const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

export default function LoginPage() {
  // State hooks to manage input fields, loading states, and modal visibility
  const [username, setUsername] = useState(''); // Email input
  const [password, setPassword] = useState(''); // Password input
  const [isLoading, setIsLoading] = useState(false); // Loading spinner during Firebase response
  const [showPassword, setShowPassword] = useState(false); // Toggles password visibility
  const [showForgotPassword, setShowForgotPassword] = useState(false); // Controls forgot password modal
  const [resetEmail, setResetEmail] = useState(''); // Email for password reset
  const [isResetting, setIsResetting] = useState(false); // Loading spinner during password reset
  const navigation = useNavigation(); // For navigating between screens

  // Function to validate email format
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email); // Returns true if email format is valid
  };

  // Function to handle login
  const handleLogin = async () => {
    // Validate input fields
    if (username.trim() === '' || password.trim() === '') {
      Alert.alert('Error', 'Please fill in both fields');
      return;
    }

    if (!validateEmail(username)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true); // Show loading spinner
    try {
      const userCredential = await signInWithEmailAndPassword(auth, username, password); // Firebase login
      console.log(userCredential.user); // Log user information
      navigation.navigate('Main'); // Navigate to 'Main' screen upon successful login
    } catch (error) {
      let errorMessage = 'An error occurred during login';
      // Handle Firebase-specific errors
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
      }
      Alert.alert('Login Error', errorMessage); // Show error message
      console.log(error.code, error.message); // Log error details
    } finally {
      setIsLoading(false); // Stop loading spinner
    }
  };

  // Function to handle password reset
  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(resetEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsResetting(true); // Start loading spinner for reset process
    try {
      await sendPasswordResetEmail(auth, resetEmail); // Firebase password reset request
      Alert.alert(
          'Success',
          'Password reset email sent! Please check your inbox.',
          [{ text: 'OK', onPress: () => setShowForgotPassword(false) }]
      );
      setResetEmail(''); // Clear reset email field
    } catch (error) {
      let errorMessage = 'An error occurred while sending reset email';
      // Handle Firebase-specific errors
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later';
          break;
      }
      Alert.alert('Error', errorMessage); // Show error message
    } finally {
      setIsResetting(false); // Stop loading spinner
    }
  };

  // Function to navigate to SignUp page
  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
      <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer} // Ensures content is scrollable
                keyboardShouldPersistTaps="handled"
            >
              {/* Splash Logo */}
              <View style={styles.imageContainer}>
                <Image
                    source={splash}
                    style={styles.logo}
                    resizeMode="contain" // Ensures logo scales properly without distortion
                />
              </View>

              <View style={styles.formContainer}>
                {/* Welcome Text */}
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to continue</Text>

                {/* Username Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor={'#A9A9A9AC'}
                      value={username}
                      onChangeText={setUsername}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor={'#A9A9A9AC'}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword} // Toggles password visibility
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

                {/* Forgot Password Button */}
                <TouchableOpacity
                    style={styles.forgotPasswordButton}
                    onPress={() => setShowForgotPassword(true)}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                    style={[styles.button, styles.loginButton]}
                    onPress={handleLogin}
                    disabled={isLoading} // Disable button while loading
                >
                  {isLoading ? (
                      <ActivityIndicator color="white" /> // Show loading spinner
                  ) : (
                      <Text style={styles.buttonText}>Login</Text>
                  )}
                </TouchableOpacity>

                {/* SignUp Link */}
                <View style={styles.signupContainer}>
                  <Text style={styles.signupText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={handleSignUp}>
                    <Text style={styles.signupLink}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Modal for Forgot Password */}
            <Modal
                visible={showForgotPassword}
                animationType="slide"
                transparent={true}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Reset Password</Text>
                  <Text style={styles.modalSubtitle}>
                    Enter your email address and we'll send you instructions to reset your password.
                  </Text>

                  <TextInput
                      style={[styles.input, styles.modalInput]}
                      placeholder="Email"
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isResetting} // Disable input while resetting
                  />

                  <TouchableOpacity
                      style={[styles.button, styles.resetButton]}
                      onPress={handleResetPassword}
                      disabled={isResetting} // Disable button while resetting
                  >
                    {isResetting ? (
                        <ActivityIndicator color="white" /> // Show loading spinner
                    ) : (
                        <Text style={styles.buttonText}>Send Reset Link</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => setShowForgotPassword(false)}
                  >
                    <Text style={styles.closeText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </SafeAreaView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
  );
}

// Styling for the page components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: windowHeight * .001,
    marginBottom: 10,
  },
  logo: {
    width: windowWidth * 0.9,
    height: windowHeight * 0.5,
  },
  formContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F7F7F',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#A9A9A9',
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 15,
    fontSize: 16,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  showPasswordText: {
    color: '#007BFF',
  },
  forgotPasswordButton: {
    marginTop: 10,
  },
  forgotPasswordText: {
    color: '#007BFF',
    fontSize: 14,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#007BFF',
    marginTop: 20,
  },
  resetButton: {
    backgroundColor: '#28A745',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupContainer: {
    marginTop: 20,
    flexDirection: 'row',
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    color: '#007BFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#7F7F7F',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    marginBottom: 15,
  },
  closeButton: {
    marginTop: 10,
  },
  closeText: {
    color: '#007BFF',
    fontSize: 16,
  },
});
