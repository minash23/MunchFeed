import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Image,
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
import { Ionicons } from '@expo/vector-icons'; // Make sure to install expo/vector-icons

// Type definitions
type RootStackParamList = {
    PendingRequests: undefined;
    Profile: { userId: string };
    // Add other screen params as needed
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
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
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
                // Navigate to login if needed
                // navigation.navigate('Login');
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
            //filter out current friends
            const friendsRef = ref(database, `users/${currentUserId}/friends`);
            const friendsSnapshot = await get(friendsRef);
            const friends = friendsSnapshot.exists() ? Object.keys(friendsSnapshot.val()) : [];

            const allUsers = snapshot.val();
            const suggestions = Object.entries(allUsers)
                .filter(([userId, _]) => userId !== currentUserId && !friends.includes(userId))
                .map(([userId, userData]: [string, any]) => ({
                    id: userId,
                    pfp: userData.profileImage,
                    username: userData.username,
                    firstname: userData.firstName,
                    lastname: userData.lastName,
                    profileImage: userData.profileImage,
                }))
                .slice(0, 10); // Increased to show more suggestions

            setSuggestedFriends(suggestions);
        } catch (error) {
            console.error('Error fetching suggested friends:', error);
            Alert.alert('Error', 'Failed to load friend suggestions');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const handleSendFriendRequest = async (friendUserId: string) => {
        try {
            const currentUserId = auth.currentUser?.uid;
            if (!currentUserId) {
                Alert.alert('Error', 'Please log in to send friend requests');
                return;
            }

            // Update friend requests for recipient
            const friendRequestRef = ref(database, `users/${friendUserId}/friendRequests/${currentUserId}`);
            await set(friendRequestRef, true);

            // Track sent request
            const sentRequestRef = ref(database, `users/${currentUserId}/sentRequests/${friendUserId}`);
            await set(sentRequestRef, true);

            // Update local state
            setSentRequests(prev => ({
                ...prev,
                [friendUserId]: true
            }));

            Alert.alert('Success', 'Friend request sent!');
        } catch (error) {
            console.error('Error sending friend request:', error);
            Alert.alert('Error', 'Failed to send friend request');
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchSuggestedFriends();
    };

    const navigateToProfile = (userId: string) => {
        navigation.navigate('Profile', { userId });
    };

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

    const renderUserItem = ({ item }: { item: User }) => (
        <View style={styles.userContainer}>
            <TouchableOpacity
                style={styles.userInfoContainer}
                onPress={() => navigateToProfile(item.id)}
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

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.headerText}>CONNECT</Text>
            <Text style={styles.subheaderText}>Suggested Friends</Text>

            {isLoading && !refreshing ? (
                <ActivityIndicator style={styles.loader} size="large" color="black" />
            ) : (
                <FlatList
                    data={suggestedFriends}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUserItem}
                    ListEmptyComponent={renderEmptyState}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="black"
                        />
                    }
                />
            )}

            <TouchableOpacity
                style={styles.pendingRequestsButton}
                onPress={() => navigation.navigate('PendingRequests')}
            >
                <Text style={styles.pendingRequestsText}>
                    View Pending Requests
                </Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    headerText: {
        fontSize: 32,
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 10,
        paddingHorizontal: 15,
    },
    subheaderText: {
        fontSize: 20,
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        color: '#666',
        marginBottom: 15,
        paddingHorizontal: 15,
    },
    listContainer: {
        flexGrow: 1,
        paddingHorizontal: 15,
    },
    userContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e0e0e0',
    },
    userInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    nameText: {
        fontSize: 16,
        color: 'black',
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        fontWeight: '600',
    },
    usernameText: {
        fontSize: 14,
        color: '#666',
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        marginTop: 2,
    },
    addButton: {
        backgroundColor: 'black',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    addButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
    },
    requestSentButton: {
        backgroundColor: '#e0e0e0',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    requestSentText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
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
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default AddFriends;
