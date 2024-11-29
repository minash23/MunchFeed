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
  // State hooks to manage the input fields, loading states, and modal visibility
  const [username, setUsername] = useState(''); // Stores username (email)
  const [password, setPassword] = useState(''); // Stores password
  const [isLoading, setIsLoading] = useState(false); // Shows loading spinner while waiting for Firebase response
  const [showPassword, setShowPassword] = useState(false); // Toggles password visibility
  const [showForgotPassword, setShowForgotPassword] = useState(false); // Controls visibility of the password reset modal
  const [resetEmail, setResetEmail] = useState(''); // Stores the email for password reset
  const [isResetting, setIsResetting] = useState(false); // Shows loading spinner for password reset
  const navigation = useNavigation(); // For navigating between screens

  // Function to validate the email format
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email); // Returns true if email is valid
  };

  // Function to handle login
  const handleLogin = async () => {
    if (username.trim() === '' || password.trim() === '') {
      Alert.alert('Error', 'Please fill in both fields');
      return;
    }

    if (!validateEmail(username)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true); // Start loading spinner
    try {
      const userCredential = await signInWithEmailAndPassword(auth, username, password); // Firebase login
      console.log(userCredential.user); // Logs user info on successful login
      navigation.navigate('Main'); // Navigate to 'Main' screen upon successful login
    } catch (error) {
      let errorMessage = 'An error occurred during login';
      // Handle specific Firebase errors
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
      console.log(error.code, error.message); // Log error for debugging
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

    setIsResetting(true); // Start loading spinner for password reset
    try {
      await sendPasswordResetEmail(auth, resetEmail); // Firebase password reset
      Alert.alert(
          'Success',
          'Password reset email sent! Please check your inbox.',
          [{ text: 'OK', onPress: () => setShowForgotPassword(false) }]
      );
      setResetEmail(''); // Clear reset email field
    } catch (error) {
      let errorMessage = 'An error occurred while sending reset email';
      // Handle specific Firebase errors
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

  // Navigate to the SignUp page
  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
      <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={"padding"}
          keyboardVerticalOffset={100}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={styles.container}>
            <View style={styles.scrollContainer}>
              <View style={styles.imageContainer}>
                <Image
                    source={splash}
                    style={styles.logo}
                    resizeMode="contain"
                />
              </View>

              <View style={styles.formContainer}>
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
            </View>

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
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowForgotPassword(false); // Close modal
                        setResetEmail(''); // Clear email field
                      }}
                      disabled={isResetting} // Disable cancel button while resetting
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
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
  scrollContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    marginBottom: 40,
  },
  logo: {
    width: windowWidth * 0.8,
    height: windowHeight * 0.2,
  },
  formContainer: {
    width: '80%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#777',
    marginVertical: 10,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 15,
    fontSize: 16,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 10,
    top: 15,
  },
  showPasswordText: {
    color: '#007bff',
  },
  forgotPasswordButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  forgotPasswordText: {
    textAlign: 'right',
    color: '#007bff',
  },
  button: {
    height: 50,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signupText: {
    fontSize: 14,
    color: '#777',
  },
  signupLink: {
    fontSize: 14,
    color: '#007bff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
  },
  modalInput: {
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#FF0000',
  },
});
