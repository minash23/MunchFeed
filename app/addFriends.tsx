import React, { useState, useEffect } from 'react';
import {View, Text, FlatList, TouchableOpacity, Button, StyleSheet, Image} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';  // Import useNavigation hook
import { auth, database } from '../config/firebaseConfig';
import { ref, get, set } from 'firebase/database';

type User = {
    id: string;
    username: string;
    firstname: string;
    lastname: string;
    profileImage?: string;
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
                    pfp: userData.profileImage,
                    username: userData.username,
                    firstname: userData.firstName,
                    lastname: userData.lastName,
                    profileImage: userData.profileImage,
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


    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.headerText}>CONNECT</Text>
            <Text style={styles.subheaderText}>Suggested</Text>

            <FlatList
                data={suggestedFriends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.userContainer}>
                        <Image
                            source = {{uri: item.profileImage}}
                            style={styles.profileImage}
                            />
                        <View style={styles.userInfo}>
                            <Text style={styles.nameText}>{item.firstname} {item.lastname}</Text>
                            <Text style={styles.usernameText}>{item.username}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleSendFriendRequest(item.id)} style={styles.addButton}>
                            <Text style={styles.addButtonText}>add</Text>
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
        paddingTop: -10,
        paddingLeft: 15,
        backgroundColor: 'white'
    },
    headerText: {
        fontSize: 32,
        fontFamily: 'Trebuchet MS',
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'left',
        paddingLeft: 5,
    },
    subheaderText: {
        fontSize: 20,
        fontFamily: 'Trebuchet MS',
        fontWeight: 'light',
        marginBottom: 20,
        textAlign: 'left',
        paddingLeft: 5,
    },
    userContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#c9c9c9',
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 10,
    },
    userInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    nameText: {
      fontSize: 16,
        color: 'black',
        fontFamily: 'Trebuchet MS',
    },
    usernameText: {
        fontSize: 12,
        color: 'gray',
        fontFamily: 'Trebuchet MS',
    },
    addButton: {
      backgroundColor: 'black',
      paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 15,
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontFamily: 'Trebuchet MS',
    },
});

export default AddFriends;
