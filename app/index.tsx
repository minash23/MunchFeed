import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../assets/images/adaptive-icon.png';
import MunchFeed from '../assets/images/MunchFeed.png'; // Assuming you have this image

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (username === '' || password === '') {
      Alert.alert('Error', 'Please fill in both fields');
      return;
    }
    // Replace this with actual authentication logic
    Alert.alert('Logged In', `Username: ${username}, Password: ${password}`);
  };

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', // Vertically centers content
    alignItems: 'center', // Horizontally centers content
    padding: 20,
  },
  imageContainer: {
    position: 'relative', // For positioning images relative to each other
    bottom: 100, // Move the images up by 100 units
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
    marginTop: -85, // Add space between the images
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
    width: '80%', // Make input fields wider
  },
});
