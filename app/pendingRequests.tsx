import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { auth, database } from '../config/firebaseConfig';
import { ref, get, set } from 'firebase/database';
// @ts-ignore
import defaultPFP from '../assets/images/defaultPFP.png';

type User = {
    id: string;
    username: string;
    profileImage?: string;
};

const PendingRequestsScreen = () => {
    const [pendingRequests, setPendingRequests] = useState<User[]>([]);
    const [friends, setFriends] = useState<User[]>([]);
    const navigation = useNavigation();

    useEffect(() => {
        fetchPendingRequests();
        fetchFriendsList();
    }, []);

    // Fetch pending friend requests
    const fetchPendingRequests = async () => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        // Get current user's friend requests
        const friendRequestsRef = ref(database, `users/${currentUserId}/friendRequests`);
        const snapshot = await get(friendRequestsRef);

        if (snapshot.exists()) {
            const requestUserIds = Object.keys(snapshot.val());

            // Fetch details of each user who sent a request
            const requests = await Promise.all(
                requestUserIds.map(async (userId: string) => {
                    const userRef = ref(database, `users/${userId}`);
                    const userSnapshot = await get(userRef);

                    if (userSnapshot.exists()) {
                        return {
                            id: userId,
                            username: userSnapshot.val().username,
                            profileImage: userSnapshot.val().profileImage,
                        };
                    }
                    return null;
                })
            );

            // Filter out null values
            setPendingRequests(requests.filter((user) => user !== null) as User[]);
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
            const friendIds = Object.keys(snapshot.val());

            // Fetch details of each friend
            const friendsList = await Promise.all(
                friendIds.map(async (friendId: string) => {
                    const friendRef = ref(database, `users/${friendId}`);
                    const friendSnapshot = await get(friendRef);

                    if (friendSnapshot.exists()) {
                        return {
                            id: friendId,
                            username: friendSnapshot.val().username,
                            profileImage: friendSnapshot.val().profileImage,
                        };
                    }
                    return null;
                })
            );

            // Filter out null values
            setFriends(friendsList.filter((user) => user !== null) as User[]);
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

    // Navigate to viewProfile
    const navigateToProfile = (userId: string) => {
        navigation.navigate('ViewProfile', { userId });
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.headerText}>Pending Friend Requests</Text>

            <FlatList
                data={pendingRequests}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.userContainer}>
                        <TouchableOpacity
                            style={styles.profileContainer}
                            onPress={() => navigateToProfile(item.id)}
                        >
                            <Image
                                source={item.profileImage ? { uri: item.profileImage } : defaultPFP}
                                style={styles.profileImage}
                            />
                            <Text style={styles.usernameText}>{item.username}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleAcceptFriendRequest(item.id)}
                            style={styles.acceptButton}
                        >
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
                        <TouchableOpacity
                            style={styles.profileContainer}
                            onPress={() => navigateToProfile(item.id)} // Navigate to viewProfile
                        >
                            <Image
                                source={item.profileImage ? { uri: item.profileImage } : defaultPFP}
                                style={styles.profileImage}
                            />
                            <Text style={styles.usernameText}>{item.username}</Text>
                        </TouchableOpacity>
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
        backgroundColor: 'white',
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'light',
        fontFamily: 'Trebuchet MS',
        marginBottom: 20,
    },
    userContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#c9c9c9',
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    usernameText: {
        fontSize: 18,
        fontFamily: 'Trebuchet MS',
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 10,
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 15,
    },
    acceptText: {
        color: 'white',
        fontFamily: 'Trebuchet MS',
    },
});

export default PendingRequestsScreen;
