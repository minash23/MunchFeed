import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, database } from '../config/firebaseConfig';
import { ref, get, set } from 'firebase/database';

const PendingRequestsScreen = () => {
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);

    useEffect(() => {
        fetchPendingRequests();
        fetchFriendsList();
    }, []);

    const fetchPendingRequests = async () => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        const friendRequestsRef = ref(database, `users/${currentUserId}/friendRequests`);
        const snapshot = await get(friendRequestsRef);

        if (snapshot.exists()) {
            const requests = Object.keys(snapshot.val());
            setPendingRequests(requests);
        }
    };

    const fetchFriendsList = async () => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        const friendsRef = ref(database, `users/${currentUserId}/friends`);
        const snapshot = await get(friendsRef);

        if (snapshot.exists()) {
            const friendIds = Object.keys(snapshot.val());
            setFriends(friendIds);
        }
    };

    const handleAcceptFriendRequest = async (friendUserId: string) => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        // Add friend to the current user
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
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.headerText}>Pending Friend Requests</Text>

            <FlatList
                data={pendingRequests}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                    <View style={styles.userContainer}>
                        <Text>{item}</Text>
                        <TouchableOpacity onPress={() => handleAcceptFriendRequest(item)}>
                            <Text style={styles.acceptText}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />

            <Text style={styles.headerText}>Your Friends</Text>

            <FlatList
                data={friends}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                    <View style={styles.userContainer}>
                        <Text>{item}</Text>
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
        marginBottom: 20,
    },
    userContainer: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    acceptText: {
        color: 'green',
    },
});

export default PendingRequestsScreen;
