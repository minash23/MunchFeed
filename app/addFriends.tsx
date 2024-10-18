import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Button, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';  // Import useNavigation hook
import { auth, database } from '../config/firebaseConfig';
import { ref, get, set } from 'firebase/database';

type User = {
    id: string;
    username: string;
};

const AddFriends = () => {
    const [uid, setUid] = useState<string | null>(null);
    const [suggestedFriends, setSuggestedFriends] = useState<User[]>([]);
    const navigation = useNavigation();  // Use navigation hook

    useEffect(() => {
        const fetchCurrentUser = async () => {
            const user = auth.currentUser;
            if (user) {
                setUid(user.uid);
                fetchSuggestedFriends();
            } else {
                console.log('No authenticated user.');
            }
        };

        fetchCurrentUser();
    }, []);

    const fetchSuggestedFriends = async () => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);

        if (snapshot.exists()) {
            const allUsers = snapshot.val();
            const suggestions = Object.entries(allUsers)
                .filter(([userId, _]) => userId !== currentUserId)
                .map(([userId, userData]: [string, any]) => ({
                    id: userId,
                    username: userData.username,
                }))
                .slice(0, 5);

            setSuggestedFriends(suggestions);
        }
    };

    const handleSendFriendRequest = async (friendUserId: string) => {
        const currentUserId = auth.currentUser?.uid;

        if (currentUserId) {
            const friendRequestRef = ref(database, `users/${friendUserId}/friendRequests/${currentUserId}`);
            await set(friendRequestRef, true);
            alert('Friend request sent!');
        } else {
            alert('User not authenticated');
        }
    };

    const promptSendFriendRequest = (userId: string) => {
        alert(`Friend request sent to ${userId}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.headerText}>Add Friends</Text>

            <FlatList
                data={suggestedFriends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.userContainer}>
                        <TouchableOpacity onPress={() => promptSendFriendRequest(item.id)}>
                            <Text style={styles.usernameText}>{item.username}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />

            <Button
                title="View Pending Friend Requests"
                onPress={() => navigation.navigate('PendingRequests')}  // Navigate to the new screen
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    userContainer: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    usernameText: {
        fontSize: 18,
        color: 'blue',
    },
});

export default AddFriends;
