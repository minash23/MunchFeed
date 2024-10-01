import React, {useState, useEffect} from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, PermissionsAndroid, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, database } from '../config/firebaseConfig'; // Firebase config
import { useNavigation } from '@react-navigation/native';
import { getDatabase, ref, query, orderByChild, equalTo, get, set, } from "firebase/database";
import {string} from "prop-types";
import Contacts from 'react-native-contacts';

type User = {
    id: string;
    name: string;
    phoneNumber: string;
    profileImage?: string;
};


// basic outline for the AddFriends component
const AddFriends = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [searchResult, setSearchResult] = useState<User | null>(null);
    const [contacts, setContacts] = useState<User[]>([]);
    const [suggestedFriends, setSuggestedFriends] = useState<User[]>([]);
    const navigation = useNavigation();

    useEffect(() => {
        fetchSuggestedFriends();
    }, []);

    const requestContactsPermission = async  () => {
        if(Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
                {
                    title: 'Contacts',
                    message: 'This app would like to view your contacts',
                    buttonPositive: 'Please accept bare mortal'
                }
            );
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                loadContacts();
            } else {
                console.log('Contacts permission denied');
            }
        }
        else {
            loadContacts();
        }
    };

    const loadContacts = () => {
        Contacts.getAll()
            .then(contacts => {
                const formattedContacts = contacts.map(contact => ({
                    id: contact.recordID,
                    name: contact.displayName,
                    phoneNumber: contact.phoneNumbers[0]?.number || '',
                }));
                setContacts(formattedContacts);
                })
            .catch(e => {
                console.log(e);
            });
    };

    const fetchSuggestedFriends = async () => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);

        if (snapshot.exists()) {
            const allUsers = snapshot.val();
            const currentUserFriendsRef = ref(database, `users/${currentUserId}/friends`);
            const friendsSnapshot = await get(currentUserFriendsRef);
            const currentUserFriends = friendsSnapshot.val() || {};

            const suggestions = Object.entries(allUsers)
                .filter(([userId, userData]: [string, any]) =>
                    userId !== currentUserId && !currentUserFriends[userId])
                .map(([userId, userData]: [string, any]) => ({
                    id: userId,
                    name: userData.name,
                    phoneNumber: userData.phoneNumber,
                    profilePicture: userData.profilePicture
                }))
                .slice(0, 5);  // limit results to 5 suggestions

            setSuggestedFriends(suggestions);
        }
    };

    // Search for users function
    const searchUsersByPhoneNumber = async () => {
        // Placeholder for Firebase Realtime Database query
        const usersRef = ref(database, 'users')
        const phoneQuery = query(usersRef, orderByChild('phoneNumber'), equalTo(phoneNumber));

        const snapshot = await get(phoneQuery);


        if (snapshot.exists()) {
            const userData = snapshot.val();
            const userId = Object.keys(userData)[0];
            setSearchResult({ id: userId, ...userData[userId] });
        } else {
            alert("No user found with that phone number");
            setSearchResult(null);
        }
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
                data={searchResult ? [searchResult] : suggestedFriends}
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

