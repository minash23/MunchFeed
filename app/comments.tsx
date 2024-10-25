import React, {useEffect, useState} from 'react';
import {
    SafeAreaView, ScrollView, TextInput, Text, StyleSheet, Button, View,
    KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image, Dimensions
} from 'react-native';
import { auth, database } from '../config/firebaseConfig';
import {ref, set, push, onValue, get} from 'firebase/database';
import { useRoute } from "@react-navigation/core";

interface user {
    userId: string;
    text: string;
    profileImage?: string;
}
interface Comment {
    userId: string;
    userName: string;
    userProfileImage?: string;
    text: string;
}

export default function CommentsPage() {
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<Comment[]>([]);
    const [postOwnerName, setPostOwnerName] = useState('');
    const [postOwnerProfile, setPostOwnerProfile] = useState('');
    const [caption, setCaption] = useState('');
    const route = useRoute();
    const { postId } = route.params as { postId: string };

    // fetch post owner profile image and username
    useEffect(() => {
        const fetchPostDetails = async () => {
            // Since postID is the same as userID, use it directly to fetch user details
            const userRef = ref(database, `users/${postId}`);
            const userSnapshot = await get(userRef);

            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                setPostOwnerName(userData.username);
                setPostOwnerProfile(userData.profileImage);
                //to find caption
                const postRef = ref(database, `posts/${postId}`);
                onValue(postRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const postData = snapshot.val();
                        setCaption(postData.caption);
                    }
                });
            } else {
                console.log('No user found with the given postId/userId');
            }
        };

        fetchPostDetails();
    }, [postId]);


    // fetch comments and commenter's details
    useEffect(() => {
        const fetchComments = async () => {
            const commentsRef = ref(database, 'comments');
            onValue(commentsRef, async (snapshot) => {
                if (snapshot.exists()) {
                    const commentsData: Comment[] = [];
                    const commentersData = snapshot.val();

                    // Loop through each commenter
                    for (let commenterId in commentersData) {
                        // Get the commenter's user data
                        const userRef = ref(database, `users/${commenterId}`);
                        const userSnapshot = await get(userRef);
                        const userData = userSnapshot.val();

                        // Loop through all comments by this commenter
                        const commenterComments = commentersData[commenterId];
                        for (let commentId in commenterComments) {
                            const comment = commenterComments[commentId];
                            commentsData.push({
                                ...comment,
                                userName: userData.username,
                                userProfileImage: userData.profileImage
                            });
                        }
                    }

                    setComments(commentsData);
                }
            });
        };

        fetchComments();
    }, [postId]);

    // Function to handle posting comments
    const postComment = async () => {
        const userId = auth.currentUser?.uid;
        const username = auth.currentUser?.displayName;
        const userProfileImage = auth.currentUser?.photoURL;
        if (userId && commentText) {
            const newCommentRef = push(ref(database, `comments/${postId}`));
            await set(newCommentRef, {
                userId,
                username,
                userProfileImage,
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
                        {/* Post Owner's Details */}
                        <View style={styles.postOwnerContainer}>
                            {postOwnerProfile ? (
                                <Image
                                    source={{ uri: postOwnerProfile }}
                                    style={styles.profileImage}
                                />
                            ) : null}
                            <View>
                                <Text style={styles.postOwnerName}>{postOwnerName}</Text>
                                <Text>{caption}</Text>
                            </View>
                        </View>
                        {/* Comments Section */}
                        {comments.length > 0 ? comments.map((comment, index) => (
                            <View key={index} style={styles.commentContainer}>
                                {comment.userProfileImage ? (
                                    <Image
                                        source={{ uri: comment.userProfileImage }}
                                        style={styles.commentProfileImage}
                                    />
                                ) : null}
                                <View>
                                    <Text style={styles.commentUserName}>{comment.userName}</Text>
                                    <Text>{comment.text}</Text>
                                </View>
                            </View>
                        )) : <Text>No comments yet!</Text>}
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
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 20,
    },
    postOwnerContainer: {
        flexDirection: 'row',
        width: Dimensions.get('window').width,
        alignItems: 'flex-start',
        marginBottom: 20,
        fontFamily: 'Trebuchet MS',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor:'black',
        paddingLeft: 8,
        paddingBottom: 5,
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 10,
    },
    postOwnerName: {
        fontWeight: 'bold',
    },
    commentContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        width: Dimensions.get('window').width,
        padding: 10,
        paddingRight: 50,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#c9c9c9',
        fontFamily: 'Trebuchet MS',
    },
    commentProfileImage: {
        width: 35,
        height: 35,
        borderRadius: 15,
        marginRight: 10,
    },
    commentUserName: {
        fontWeight: 'bold',
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
    postButton: {
        paddingBottom: 18
    }
});
