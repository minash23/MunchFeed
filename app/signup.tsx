import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { auth } from '../config/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
// @ts-ignore
import splash from '../assets/images/splash.png';
export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const navigation = useNavigation();

  const handleSignup = () => {
    if (name === '' || email === '' || password === '' || phoneNumber === '') {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log('User signed up:', user);


        // Save user details to Realtime Database
        const db = getDatabase();
        set(ref(db, 'users/' + user.uid), {
          name: name,
          email: email,
          phoneNumber: phoneNumber,
        })
        .then(() => {
          console.log('User data saved to database');
          setName('')
          setEmail('')
          setPassword('')
          setPhoneNumber('')

          navigation.navigate('Profile');
        })
        .catch((error) => {
          console.error('Error saving user data:', error);
          Alert.alert('Database Error', 'Error saving user data');
        });
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        Alert.alert('Signup Error', `Error: ${errorMessage}`);
        console.log(errorCode, errorMessage);
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.imageContainer}>
        <Image source={splash} style={styles.logo} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={true}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />

      <Button title="Sign Up" onPress={handleSignup} />
    </SafeAreaView>
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
    bottom: 75,
    justifyContent: 'flex-end',
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
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
    width: '80%',
  },
});
