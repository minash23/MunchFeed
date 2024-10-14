import React, {useEffect, useState} from 'react';
import { SafeAreaView, ScrollView, TextInput, Text, StyleSheet, Button, View,
    KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { auth, database } from '../config/firebaseConfig';
import {ref, set, push, onValue} from 'firebase/database';
import {useRoute} from "@react-navigation/core";

export default function CommentsPage() {
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState([]);
    const [postOwnerName, setPostOwnerName] = useState('');
    const [caption, setCaption] = useState('');
    const route = useRoute();
    const postId = route.params;


    useEffect(() => {
        const fetchPostDetails = async () => {
            const postRef = ref(database, `posts/${postId}`);
            onValue(postRef, (snapshot) => {
                if (snapshot.exists()) {
                    const postData = snapshot.val();
                    setPostOwnerName(postData.name);
                    setCaption(postData.meal);
                } else {
                    console.log('No post found with the given postId');
                }
            });
        };

        fetchPostDetails();
    }, [postId]); // empty brackets [] to test hardcoded posts


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
            alert('Please log in to enter a comment!');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={100}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <SafeAreaView style={styles.container}>
                    <ScrollView contentContainerStyle={styles.scrollViewContent}>
                        <View style={styles.postOwnerComment}>
                            <Text>{postOwnerName}</Text>
                            <Text>{caption}</Text>
                        </View>
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
                        <View style={styles.postButton}>
                        <Button title="Post" onPress={postComment} />
                        </View>
                    </View>
                </SafeAreaView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 20,
        paddingHorizontal: 10,
        width: '80%',
    },
    postOwnerComment: {
        paddingBottom: 10,
        borderBottomColor: 'grey',
        borderBottomWidth: 1,
        width: '120%',
    },
    Comment: {

    },
    postButton: {
        paddingBottom: 18
    }
});
