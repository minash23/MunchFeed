import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, database } from '../config/firebaseConfig';
import { ref, get, set } from 'firebase/database';

type User = {
    id: string;
    username: string;
};

const PendingRequestsScreen = () => {
    const [pendingRequests, setPendingRequests] = useState<User[]>([]);
    const [friends, setFriends] = useState<User[]>([]);

    useEffect(() => {
        fetchPendingRequests();
        fetchFriendsList();
    }, []);

    // Fetch pending friend requests
    const fetchPendingRequests = async () => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        const friendRequestsRef = ref(database, `users/${currentUserId}/friendRequests`);
        const snapshot = await get(friendRequestsRef);

        if (snapshot.exists()) {
            const requests = await Promise.all(
                Object.keys(snapshot.val()).map(async (userId: string) => {
                    const userRef = ref(database, `users/${userId}`);
                    const userSnapshot = await get(userRef);
                    return {
                        id: userId,
                        username: userSnapshot.val().username,
                    };
                })
            );
            setPendingRequests(requests);
        } else {
            setPendingRequests([]);
        }
    };

    // Fetch current friends list
    const fetchFriendsList = async () => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        const friendsRef = ref(database, `users/${currentUserId}/friends`);
        const snapshot = await get(friendsRef);

        if (snapshot.exists()) {
            const friendsList = await Promise.all(
                Object.keys(snapshot.val()).map(async (friendId: string) => {
                    const friendRef = ref(database, `users/${friendId}`);
                    const friendSnapshot = await get(friendRef);
                    return {
                        id: friendId,
                        username: friendSnapshot.val().username,
                    };
                })
            );
            setFriends(friendsList);
        } else {
            setFriends([]);
        }
    };

    // Handle accepting a friend request
    const handleAcceptFriendRequest = async (friendUserId: string) => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        try {
            // Add friend to the current user's friends list
            const currentUserFriendRef = ref(database, `users/${currentUserId}/friends/${friendUserId}`);
            await set(currentUserFriendRef, true);

            // Add current user to the friend's friends list
            const friendUserFriendRef = ref(database, `users/${friendUserId}/friends/${currentUserId}`);
            await set(friendUserFriendRef, true);

            // Remove the friend request
            const friendRequestRef = ref(database, `users/${currentUserId}/friendRequests/${friendUserId}`);
            await set(friendRequestRef, null);

            alert('Friend request accepted!');

            // Refresh pending requests and friends list
            fetchPendingRequests();
            fetchFriendsList();
        } catch (error) {
            console.error('Error accepting friend request:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.headerText}>Pending Friend Requests</Text>

            <FlatList
                data={pendingRequests}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.userContainer}>
                        <Text style={styles.usernameText}>{item.username}</Text>
                        <TouchableOpacity onPress={() => handleAcceptFriendRequest(item.id)}>
                            <Text style={styles.acceptText}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />

            <Text style={styles.headerText}>Your Friends</Text>

            <FlatList
                data={friends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.userContainer}>
                        <Text style={styles.usernameText}>{item.username}</Text>
                    </View>
                )}
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
        fontFamily: 'Helvetica',
        marginBottom: 20,
    },
    userContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    usernameText: {
        fontSize: 18,
        fontFamily: 'Helvetica',
    },
    acceptText: {
        color: 'green',
    },
});

export default PendingRequestsScreen;
