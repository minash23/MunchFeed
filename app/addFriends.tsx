import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Image,
    TextInput,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { auth, database } from '../config/firebaseConfig';
import { ref, get, set } from 'firebase/database';
import defaultPFP from '../assets/images/defaultPFP.png';
import { Ionicons } from '@expo/vector-icons';

// Type definitions
type RootStackParamList = {
    PendingRequests: undefined;
    Profile: { userId: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

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
    const [filteredFriends, setFilteredFriends] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sentRequests, setSentRequests] = useState<Record<string, boolean>>({});

    const navigation = useNavigation<NavigationProp>();
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            fetchCurrentUser();
        }
    }, [isFocused]);

    const fetchCurrentUser = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                setUid(user.uid);
                await fetchSuggestedFriends();
                await fetchSentRequests(user.uid);
            } else {
                Alert.alert('Error', 'Please log in to view friend suggestions');
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
            Alert.alert('Error', 'Failed to load user data');
        }
    };

    const fetchSentRequests = async (currentUserId: string) => {
        try {
            const sentRequestsRef = ref(database, `users/${currentUserId}/sentRequests`);
            const snapshot = await get(sentRequestsRef);
            if (snapshot.exists()) {
                setSentRequests(snapshot.val());
            }
        } catch (error) {
            console.error('Error fetching sent requests:', error);
        }
    };

    const fetchSuggestedFriends = async () => {
        setIsLoading(true);
        try {
            const currentUserId = auth.currentUser?.uid;
            if (!currentUserId) return;

            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);

            if (!snapshot.exists()) {
                setSuggestedFriends([]);
                return;
            }
            const friendsRef = ref(database, `users/${currentUserId}/friends`);
            const friendsSnapshot = await get(friendsRef);
            const friends = friendsSnapshot.exists() ? Object.keys(friendsSnapshot.val()) : [];

            const allUsers = snapshot.val();
            const suggestions = Object.entries(allUsers)
                .filter(([userId, _]) => userId !== currentUserId && !friends.includes(userId))
                .map(([userId, userData]: [string, any]) => ({
                    id: userId,
                    username: userData.username,
                    firstname: userData.firstName,
                    lastname: userData.lastName,
                    profileImage: userData.profileImage,
                }));

            setSuggestedFriends(suggestions);
            setFilteredFriends(suggestions);
        } catch (error) {
            console.error('Error fetching suggested friends:', error);
            Alert.alert('Error', 'Failed to load friend suggestions');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setFilteredFriends(suggestedFriends);
        } else {
            const filtered = suggestedFriends.filter(friend =>
                friend.username.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredFriends(filtered);
        }
    };

    const renderUserItem = ({ item }: { item: User }) => (
        <View style={styles.userContainer}>
            <TouchableOpacity
                style={styles.userInfoContainer}
                onPress={() => navigation.navigate('Profile', { userId: item.id })}
            >
                <Image
                    source={item.profileImage ? { uri: item.profileImage } : defaultPFP}
                    style={styles.profileImage}
                />
                <View style={styles.userInfo}>
                    <Text style={styles.nameText}>{item.firstname} {item.lastname}</Text>
                    <Text style={styles.usernameText}>@{item.username}</Text>
                </View>
            </TouchableOpacity>

            {!sentRequests[item.id] ? (
                <TouchableOpacity
                    onPress={() => handleSendFriendRequest(item.id)}
                    style={styles.addButton}
                >
                    <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.requestSentButton}>
                    <Text style={styles.requestSentText}>Sent</Text>
                </View>
            )}
        </View>
    );

    const handleSendFriendRequest = async (friendUserId: string) => {
        try {
            const currentUserId = auth.currentUser?.uid;
            if (!currentUserId) {
                Alert.alert('Error', 'Please log in to send friend requests');
                return;
            }

            const friendRequestRef = ref(database, `users/${friendUserId}/friendRequests/${currentUserId}`);
            await set(friendRequestRef, true);

            const sentRequestRef = ref(database, `users/${currentUserId}/sentRequests/${friendUserId}`);
            await set(sentRequestRef, true);

            setSentRequests(prev => ({
                ...prev,
                [friendUserId]: true,
            }));

            Alert.alert('Success', 'Friend request sent!');
        } catch (error) {
            console.error('Error sending friend request:', error);
            Alert.alert('Error', 'Failed to send friend request');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.headerText}>Add Friends</Text>
            <TextInput
                style={styles.searchBar}
                placeholder="Search by username..."
                value={searchQuery}
                onChangeText={handleSearch}
            />
            {isLoading ? (
                <ActivityIndicator style={styles.loader} size="large" color="black" />
            ) : (
                <FlatList
                    data={filteredFriends}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUserItem}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={fetchSuggestedFriends} />
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white', paddingHorizontal: 15 },
    headerText: { fontSize: 32, fontWeight: 'bold', marginTop: 10, marginBottom: 20 },
    searchBar: {
        height: 40,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 15,
    },
    listContainer: { flexGrow: 1 },
    userContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e0e0e0',
    },
    userInfoContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    profileImage: { width: 50, height: 50, borderRadius: 25, marginRight: 10 },
    userInfo: { flex: 1 },
    nameText: { fontSize: 16, fontWeight: '600' },
    usernameText: { fontSize: 14, color: '#666' },
    addButton: {
        backgroundColor: 'black',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 5,
    },
    addButtonText: { color: 'white', fontSize: 14 },
    requestSentButton: {
        backgroundColor: '#e0e0e0',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 5,
    },
    requestSentText: { color: '#666', fontSize: 14 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default AddFriends;
