import React, { useState } from 'react';
import {SafeAreaView, ScrollView, TextInput, Text, StyleSheet, Button, View} from 'react-native';
import { auth, database } from '../config/firebaseConfig'; // Ensure Firebase is configured properly
import { ref, set, push } from 'firebase/database';

export default function CommentsPage() {
    const [commentText, setCommentText] = useState('');
    const postId = 'sample-post-id'; // Replace with actual postId
    const [comments, setComments] = useState([]);

    // Function to handle posting comments
    const postComment = async () => {
        const userId = auth.currentUser?.uid;
        if (userId && commentText) {
            const newCommentRef = push(ref(database, `comments/${postId}`)); // Store comments under specific postId
            await set(newCommentRef, {
                userId,
                text: commentText,
            });
            setCommentText(''); // Clear the input after posting
        } else {
            alert('Please log in and enter a comment!');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <Text>Welcome to your comments!</Text>
                <Text>{comments}</Text>
            </ScrollView>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Add a comment..."
                    value={commentText}
                    onChangeText={setCommentText}
                />
                <Button title="Post" onPress={postComment} />
            </View>
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
    inputContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 20,
        paddingHorizontal: 10,
        width: '80%',
    },
});
