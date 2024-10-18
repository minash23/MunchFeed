import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { ref, set, push } from 'firebase/database';
import { database, auth } from '../config/firebaseConfig'; // Firebase setup

/*
export default function PostPage() {
  return (
    <View>
      <Text>Welcome to your Post Page!</Text>
    </View>
  );

  const styles = StyleSheet.create({
      container:  {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff',
          padding: 20,
      }
  })
}
*/



type UploadPostProps = {
    navigation: NavigationProp<any>;
};

export default function UploadPost({ navigation }: UploadPostProps) {
    const [mealCaption, setMealCaption] = useState('');
    const [mealImage, setMealImage] = useState(null);

    const handleImageUpload = () => {
        launchImageLibrary({ mediaType: 'photo' }, (response) => {
            if (!response.didCancel && response.assets && response.assets.length > 0) {
                setMealImage(response.assets[0].uri); //image URI
            }
        });
    };

    const handlePostUpload = async () => {
        const userId = auth.currentUser?.uid;
        if (userId && mealCaption && mealImage) {
            const newPostRef = push(ref(database, 'posts/'));
            await set(newPostRef, {
                userId,
                meal: mealCaption,
                imageUrl: mealImage,
                timestamp: Date.now(),
            });
            setMealCaption('');
            setMealImage(null);
            alert('Post uploaded successfully!');
            navigation.navigate('Home'); // Navigate back to main feed
        } else {
            alert('Please add a caption and image.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Share Your Meal</Text>

            <TouchableOpacity style={styles.imagePlaceholder} onPress={handleImageUpload}>
                {mealImage ? (
                    <Image source={{ uri: mealImage }} style={styles.uploadedImage} />
                ) : (
                    <Text style={styles.imagePlaceholderText}>Upload Meal Image</Text>
                )}
            </TouchableOpacity>

            <TextInput
                style={styles.input}
                placeholder="Add a caption..."
                value={mealCaption}
                onChangeText={setMealCaption}
            />

            <Button title="Post" onPress={handlePostUpload} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    imagePlaceholder: {
        width: 200,
        height: 200,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        marginBottom: 20,
    },
    imagePlaceholderText: {
        color: '#666',
    },
    uploadedImage: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        paddingHorizontal: 10,
        marginBottom: 20,
        width: '80%',
        borderRadius: 10,
    },
});


