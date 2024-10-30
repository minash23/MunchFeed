import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebaseConfig'; // Adjust the import path if needed
import { useNavigation } from '@react-navigation/native';
// @ts-ignore
import splash from '../assets/images/splash.png';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation(); // Correctly get navigation

  const handleLogin = () => {
    if (username === '' || password === '') {
      Alert.alert('Error', 'Please fill in both fields');
      return;
    }

    signInWithEmailAndPassword(auth, username, password)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log(user);
        navigation.navigate('Main'); // Ensure 'Profile' matches the name in your Stack.Navigator
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        Alert.alert('Login Error', `Error: ${errorMessage}`);
        console.log(errorCode, errorMessage);
      });
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  }

  return (
      <KeyboardAvoidingView
        style={{flex: 1}} behavior={'padding'}  keyboardVerticalOffset={2} >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <SafeAreaView style={styles.container}>
      <View style={styles.imageContainer}>
        <Image source={splash} style={styles.logo} />
      </View>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={true}
      />
      <Button title="Login" onPress={handleLogin} />
      <Button title = "Sign Up" onPress = {handleSignUp} />
    </SafeAreaView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  imageContainer: {
    position: 'relative',
    bottom: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -100,
  },
  logo: {
    width: 400,
    height: 400,
  },
  munchfeed: {
    width: 200,
    height: 35,
    marginTop: -85,
  },
  title: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 0,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
    width: '80%',
  },
});
