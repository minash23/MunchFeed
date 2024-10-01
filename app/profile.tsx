import React, { useState } from 'react';
import { View, Text, TextInput, Button, Image, SafeAreaView, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker'; // Install with 'expo install expo-image-picker'
import { useNavigation } from '@react-navigation/native';

export default function ProfilePage() {
    const [profileImage, setProfileImage] = useState(null);
    const [firstName, setFirstName] = useState('Kyrellos');
    const [lastName, setLastName] = useState('Ibrahim');
    const [username, setUsername] = useState('KoolCid24');
    const [foodPreference, setFoodPreference] = useState('Soul Food');
    const [location, setLocation] = useState('San Francisco, CA');
    const [email, setEmail] = useState('name@example.com');
    const [phoneNumber, setPhoneNumber] = useState('615-123-4567');
    const [birthday, setBirthday] = useState('09/18/2004');
    const navigation = useNavigation(); // Correctly get navigation

    // Allows picking an image
    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled && result.assets[0].fileSize <= 5000000) {
            setProfileImage(result.assets[0].uri);
        } else {
            alert('Please select a JPG or PNG image smaller than 5 MB.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <View style={styles.profileContainer}>
                    <TouchableOpacity onPress={pickImage} style={styles.imageUpload}>
                        {profileImage ? (
                            <Image source={{ uri: profileImage }} style={styles.profileImage} />
                        ) : (
                            <Text style={styles.imagePlaceholder}>Upload New Image</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.detailsContainer}>
                        <Text style={styles.label}>Account Details:</Text>

                        <Text style={styles.field}>Username:</Text>
                        <TextInput style={styles.input} value={username} onChangeText={setUsername} />

                        <Text style={styles.field}>First Name:</Text>
                        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

                        <Text style={styles.field}>Last Name:</Text>
                        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />

                        <Text style={styles.field}>Food Preference:</Text>
                        <TextInput style={styles.input} value={foodPreference} onChangeText={setFoodPreference} />

                        <Text style={styles.field}>Location:</Text>
                        <TextInput style={styles.input} value={location} onChangeText={setLocation} />

                        <Text style={styles.field}>Email:</Text>
                        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

                        <Text style={styles.field}>Phone Number:</Text>
                        <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />

                        <Text style={styles.field}>Birthday:</Text>
                        <TextInput style={styles.input} value={birthday} onChangeText={setBirthday} />
                    </View>

                    <Button
                        title="SAVE"
                        onPress={() => {
                            alert('Profile Saved!');
                            navigation.navigate("Main");
                        }}
                    />

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollViewContent: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    profileContainer: {
        width: '100%',
        alignItems: 'center',
    },
    imageUpload: {
        backgroundColor: '#ddd',
        width: 150,
        height: 150,
        borderRadius: 75,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    profileImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
    },
    imagePlaceholder: {
        color: '#888',
        textAlign: 'center',
    },
    detailsContainer: {
        width: '100%',
        padding: 10,
    },
    label: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    field: {
        fontSize: 16,
        marginTop: 10,
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
});
