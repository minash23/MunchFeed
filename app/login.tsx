import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebaseConfig'; // Adjust the import path if needed
import { useNavigation } from '@react-navigation/native';

// Importing images properly
import Logo from '../assets/images/adaptive-icon.png';
import MunchFeed from '../assets/images/MunchFeed.png';

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
        navigation.navigate('Profile'); // Ensure 'Profile' matches the name in your Stack.Navigator
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
    <SafeAreaView style={styles.container}>
      <View style={styles.imageContainer}>
        <Image source={Logo} style={styles.logo} />
        <Image source={MunchFeed} style={styles.munchfeed} />
      </View>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageContainer: {
    position: 'relative',
    bottom: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 300,
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
