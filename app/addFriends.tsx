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
// @ts-ignore
import defaultPFP from '../assets/images/defaultPFP.png';
import { Ionicons } from '@expo/vector-icons';

// Type definitions for navigation and user data
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
    // State variables to manage data and UI
    const [uid, setUid] = useState<string | null>(null); // Current user ID
    const [suggestedFriends, setSuggestedFriends] = useState<User[]>([]); // List of suggested friends
    const [filteredFriends, setFilteredFriends] = useState<User[]>([]); // Filtered list based on search query
    const [isLoading, setIsLoading] = useState(false); // Loader state
    const [refreshing, setRefreshing] = useState(false); // Refreshing state
    const [searchQuery, setSearchQuery] = useState(''); // Search input
    const [sentRequests, setSentRequests] = useState<Record<string, boolean>>({}); // Track sent requests

    // Navigation and lifecycle hooks
    const navigation = useNavigation<NavigationProp>();
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            fetchCurrentUser(); // Fetch current user data when the screen is focused
        }
    }, [isFocused]);

    // Function to fetch current user details
    const fetchCurrentUser = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                setUid(user.uid); // Set user ID
                await fetchSuggestedFriends(); // Fetch suggested friends
                await fetchSentRequests(user.uid); // Fetch sent friend requests
            } else {
                Alert.alert('Error', 'Please log in to view friend suggestions');
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
            Alert.alert('Error', 'Failed to load user data');
        }
    };

    // Function to fetch the list of sent friend requests
    const fetchSentRequests = async (currentUserId: string) => {
        try {
            const sentRequestsRef = ref(database, `users/${currentUserId}/sentRequests`);
            const snapshot = await get(sentRequestsRef);
            if (snapshot.exists()) {
                setSentRequests(snapshot.val()); // Set sent requests
            }
        } catch (error) {
            console.error('Error fetching sent requests:', error);
        }
    };

    // Function to fetch suggested friends for the current user
    const fetchSuggestedFriends = async () => {
        setIsLoading(true); // Show loading indicator
        try {
            const currentUserId = auth.currentUser?.uid;
            if (!currentUserId) return;

            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);

            if (!snapshot.exists()) {
                setSuggestedFriends([]);
                return;
            }
            // Get list of current user's friends to exclude them from suggestions
            const friendsRef = ref(database, `users/${currentUserId}/friends`);
            const friendsSnapshot = await get(friendsRef);
            const friends = friendsSnapshot.exists() ? Object.keys(friendsSnapshot.val()) : [];

            // Get all users and filter out the current user's friends
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
            setFilteredFriends(suggestions); // Set both suggested and filtered friends
        } catch (error) {
            console.error('Error fetching suggested friends:', error);
            Alert.alert('Error', 'Failed to load friend suggestions');
        } finally {
            setIsLoading(false); // Hide loading indicator
            setRefreshing(false); // Stop refreshing state
        }
    };

    // Handle search functionality
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setFilteredFriends(suggestedFriends); // Show all if search is cleared
        } else {
            const filtered = suggestedFriends.filter(friend =>
                friend.username.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredFriends(filtered); // Filter friends by username
        }
    };
    const navigateToProfile = (userId: string) => {
        // @ts-ignore
        navigation.navigate('ViewProfile', { userId });
    };

    // Function to render each user in the list
    const renderUserItem = ({ item }: { item: User }) => (
        <View style={styles.userContainer}>
            <TouchableOpacity
                style={styles.userInfoContainer}
                onPress={() => navigateToProfile(item.id)}
            >
                <Image
                    source={item.profileImage ? { uri: item.profileImage } : defaultPFP} // Display profile image or default
                    style={styles.profileImage}
                />
                <View style={styles.userInfo}>
                    <Text style={styles.nameText}>{item.firstname} {item.lastname}</Text>
                    <Text style={styles.usernameText}>@{item.username}</Text>
                </View>
            </TouchableOpacity>

            {/* Display Add button if request not sent */}
            {!sentRequests[item.id] ? (
                <TouchableOpacity
                    onPress={() => handleSendFriendRequest(item.id)} // Handle sending friend request
                    style={styles.addButton}
                >
                    <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.requestSentButton}>
                    <Text style={styles.requestSentText}>Sent</Text> {/* Show "Sent" if request is sent */}
                </View>
            )}
        </View>
    );
    const renderEmptyState = () => (
        <View style={styles.emptyStateContainer}>
            <Ionicons name="people-outline" size={50} color="gray" />
            <Text style={styles.emptyStateText}>
                No friend suggestions available at the moment
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
        </View>
    );
    const onRefresh = () => {
        setRefreshing(true);
        fetchSuggestedFriends();
    };

    // Function to handle sending a friend request
    const handleSendFriendRequest = async (friendUserId: string) => {
        try {
            const currentUserId = auth.currentUser?.uid;
            if (!currentUserId) {
                Alert.alert('Error', 'Please log in to send friend requests');
                return;
            }

            const friendRequestRef = ref(database, `users/${friendUserId}/friendRequests/${currentUserId}`);
            await set(friendRequestRef, true); // Set the friend request in Firebase

            const sentRequestRef = ref(database, `users/${currentUserId}/sentRequests/${friendUserId}`);
            await set(sentRequestRef, true); // Mark the request as sent

            setSentRequests(prev => ({
                ...prev,
                [friendUserId]: true, // Update sent request status locally
            }));

            Alert.alert('Success', 'Friend request sent!');
        } catch (error) {
            console.error('Error sending friend request:', error);
            Alert.alert('Error', 'Failed to send friend request');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainContent}>
                <Text style={styles.headerText}>CONNECT</Text>
                <TextInput
                    style={styles.searchBar}
                    placeholder="Search by username..."
                    placeholderTextColor={'#A9A9A9AC'}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
                <Text style={styles.subheaderText}>Suggested Friends</Text>
                {isLoading ? (
                    <ActivityIndicator style={styles.loader} size="large" color="black" />
                ) : (
                    <FlatList
                        data={filteredFriends}
                        keyExtractor={(item) => item.id}
                        renderItem={renderUserItem}
                        ListEmptyComponent={renderEmptyState}
                        contentContainerStyle={[
                            styles.listContainer,
                            { paddingBottom: 80 } // Add padding to account for the fixed button
                        ]}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={fetchSuggestedFriends}
                                tintColor={'black'}
                            />
                        }
                    />
                )}
            </View>
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.pendingRequestsButton}
                    onPress={() => navigation.navigate('PendingRequests')}
                >
                    <Text style={styles.pendingRequestsText}>
                        View Pending Requests
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    mainContent: {
        flex: 1,
        paddingHorizontal: 15,
    },
    headerText: {
        fontSize: 32,
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 20,
    },
    subheaderText: {
        fontSize: 20,
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        color: '#666',
        marginBottom: 15,
        paddingHorizontal: 15,
    },
    searchBar: {
        height: 40,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 15,
    },
    listContainer: {
        flexGrow: 1
    },
    userContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e0e0e0',
    },
    userInfoContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    profileImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    userInfo: { flexDirection: 'column' },
    nameText: { fontSize: 16, fontWeight: 'bold' },
    usernameText: { fontSize: 14, color: '#777' },
    addButton: {
        backgroundColor: '#1e90ff',
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 20,
    },
    addButtonText: { color: 'white', fontSize: 16 },
    requestSentButton: {
        backgroundColor: '#cccccc',
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 20,
    },
    requestSentText: { color: 'white', fontSize: 16 },
    loader: { marginTop: 20 },
    pendingRequestsButton: {
        margin: 15,
        backgroundColor: 'black',
        borderRadius: 25,
        padding: 15,
        alignItems: 'center',
    },
    pendingRequestsText: {
        color: 'white',
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        fontSize: 16,
        color: 'gray',
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    refreshButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'black',
        borderRadius: 20,
    },
    refreshButtonText: {
        color: 'white',
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        fontSize: 14,
        fontWeight: '600',
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        paddingHorizontal: 15,
        paddingBottom: 15,
        elevation: 5,
    },
});

export default AddFriends;
