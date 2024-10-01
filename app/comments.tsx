import React, { useState } from 'react';
import { auth, database } from '../config/firebaseConfig';
import { View, Text, TextInput, Button, Image, SafeAreaView, StyleSheet, ScrollView, TouchableOpacity, FlatList} from 'react-native';
import { ref, set, get, push } from 'firebase/database';
import {string} from "prop-types";
import {util} from "node-forge";
import {data} from "@remix-run/router/utils";


type Comment = {
    id: string;
    userId: string;
    text: string;
}

type CommentsProps = {
    postId: string;
}


const Comments = ({ postId }: CommentsProps) => {
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<Comment[]>([]);

    //fetch post's comments
    const postCommeent = async () => {
        const userId = auth.currentUser?.uid

        if(userId && commentText) {
            const newCommentRef = push(ref(database, `comments/${postId}`));
            await set(newCommentRef, {
                userId,
                text: commentText,
            });
            setCommentText('');
        }
    }
}








export default function CommentsPage(){
    return(
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <Text>Welcome to your comments!</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

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
});