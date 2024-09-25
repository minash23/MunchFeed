import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, database } from '../config/firebaseConfig'; // Firebase config
import { useNavigation } from '@react-navigation/native';
import { getDatabase, ref, query, orderByChild, equalTo, get, set, } from "firebase/database";
import {string} from "prop-types";

// basic outline for the AddFriends component
const AddFriends = () => {

    const [phoneNumber, setPhoneNumber] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);

    const navigation = useNavigation();
    type User = {
        id: string;
        name: string;
        phoneNumber: string;
    };

    // Search for users function
    const searchUsersByPhoneNumber = async () => {
        // Placeholder for Firebase Realtime Database query
        const usersRef = ref(database, 'users')
        const phoneQuery = query(usersRef, orderByChild('phoneNumber'), equalTo(phoneNumber));

        const snapshot = await get(phoneQuery);

        const users: User[] = [];

        snapshot.forEach(childSnapshot => {
            users.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        if(users.length === 0) {
            alert("No users found with that phone number")
        }

        setSearchResults(users);
    };

    // Function to add a friend
    const handleAddFriend = async (friendUserId: string) => {
        const currentUserId = auth.currentUser?.uid;

        if(currentUserId) {
            const currentUserRef = ref(database, `users/${currentUserId}/friends/${friendUserId}`);
            const friendUserRef = ref(database, `users/${friendUserId}/friends/${currentUserId}`);

            await set(currentUserRef, true);
            await set(friendUserRef, true);

            alert('Friend added!');
        } else {
            alert('User not authenticated')
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.headerText}>Add Friends</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType={"phone-pad"}
            />

            <Button title="Search" onPress={searchUsersByPhoneNumber} />

            <Text style={styles.recFriendsHeader}>Recommended Friends</Text>


            <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.userContainer}>
                        <Text>{item.name}</Text>
                        <Text>{item.phoneNumber}</Text>
                        <TouchableOpacity onPress={() => handleAddFriend(item.id)}>
                            <Text style={styles.addFriendText}>Add Friend</Text>
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
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    recFriendsHeader: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 20,
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    userContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    addFriendText: {
        color: 'blue',
    },
});

export default AddFriends;
