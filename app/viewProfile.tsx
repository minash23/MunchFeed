import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Button,
    FlatList,
    Image,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { ref, get, push, onValue, remove } from 'firebase/database';
import { database } from '../config/firebaseConfig';
import Icon from 'react-native-vector-icons/FontAwesome'; // FontAwesome icon for location
import defaultPFP from '../assets/images/defaultPFP.png'; // Default profile image if none is provided
import { MaterialCommunityIcons } from '@expo/vector-icons'; // MaterialCommunityIcons for food preference

type RouteParams = {
    userId: string; // User's ID passed via route parameters
};

type ProfileData = {
    profileImage?: string;
    firstName: string;
    lastName: string;
    username: string;
    location?: string;
    foodPreference?: string;
};

type Comment = {
    id: string;
    text: string;
    username: string; // Comment's author's username
};

// InfoRow component for displaying individual profile details with icons
const InfoRow = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <View style={styles.infoContainer}>
        {icon}  {/* Display icon */}
        <Text style={styles.infoText}>{text}</Text>  {/* Display corresponding text */}
    </View>
);

const ViewProfile = () => {
    const route = useRoute();
    const { userId } = route.params as RouteParams;  // Extract userId from route parameters

    // State variables for profile data, comments, new comment input, loading state, and modal visibility
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // useEffect hook for fetching user profile data and comments on component mount
    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const userRef = ref(database, `users/${userId}`);
                const snapshot = await get(userRef);

                if (snapshot.exists()) {
                    setProfileData(snapshot.val());  // Store profile data in state
                } else {
                    Alert.alert('Error', 'User not found');  // Display error if user not found
                }
            } catch (error) {
                console.error('Error fetching profile data:', error);
                Alert.alert('Error', 'Failed to load profile');
            } finally {
                setIsLoading(false);  // Set loading to false after data fetch
            }
        };

        const fetchComments = () => {
            const commentsRef = ref(database, `users/${userId}/comments`);
            onValue(commentsRef, (snapshot) => {
                const fetchedComments: Comment[] = [];
                snapshot.forEach((childSnapshot) => {
                    fetchedComments.push({
                        id: childSnapshot.key!, // Comment ID
                        text: childSnapshot.val().text, // Comment text
                        username: childSnapshot.val().username, // Comment author's username
                    });
                });
                setComments(fetchedComments); // Set comments in state
            });
        };

        fetchProfileData(); // Fetch profile data
        fetchComments(); // Fetch comments
    }, [userId]); // Re-run effect when userId changes

    // Function to handle adding a new comment
    const handleAddComment = async () => {
        if (!newComment.trim()) {
            Alert.alert('Error', 'Comment cannot be empty');  // Alert if comment is empty
            return;
        }

        try {
            const commentsRef = ref(database, `users/${userId}/comments`);
            await push(commentsRef, { text: newComment.trim(), username: 'Anonymous' }); // Add new comment to Firebase
            setNewComment(''); // Clear the input field
        } catch (error) {
            console.error('Error adding comment:', error);
            Alert.alert('Error', 'Failed to add comment');
        }
    };

    // Function to handle deleting a comment
    const handleDeleteComment = async (commentId: string) => {
        try {
            const commentRef = ref(database, `users/${userId}/comments/${commentId}`);
            await remove(commentRef); // Remove comment from Firebase
        } catch (error) {
            console.error('Error deleting comment:', error);
            Alert.alert('Error', 'Failed to delete comment');
        }
    };

    // Show loading indicator while data is being fetched
    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="black" />
            </SafeAreaView>
        );
    }

    // Return null if profile data is not found
    if (!profileData) return null;

    // Destructure profile data
    const {
        profileImage,
        firstName,
        lastName,
        username,
        location,
        foodPreference,
    } = profileData;

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <SafeAreaView style={styles.container}>
                {/* Modal for Enlarged Profile Picture */}
                <Modal
                    visible={isModalVisible}
                    transparent={true}
                    onRequestClose={() => setIsModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <Image
                            source={profileImage ? { uri: profileImage } : defaultPFP}
                            style={styles.modalImage}
                        />
                        <Button title="Close" onPress={() => setIsModalVisible(false)} />
                    </View>
                </Modal>

                {/* Scrollable profile content */}
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Clicking on profile image opens modal */}
                    <TouchableOpacity onPress={() => setIsModalVisible(true)}>
                        <Image
                            source={profileImage ? { uri: profileImage } : defaultPFP}
                            style={styles.profileImage}
                        />
                    </TouchableOpacity>

                    {/* Display profile name and username */}
                    <Text style={styles.nameText}>
                        {firstName || 'First Name'} {lastName || 'Last Name'}
                    </Text>
                    <Text style={styles.usernameText}>@{username}</Text>

                    {/* Display user location and food preference */}
                    <InfoRow
                        icon={<Icon name="map-pin" size={20} color="#000" />}
                        text={`Location: ${location || 'N/A'}`}
                    />
                    <InfoRow
                        icon={<MaterialCommunityIcons name="silverware" size={22} color="#000" />}
                        text={`Food Preference: ${foodPreference || 'N/A'}`}
                    />

                    {/* Comments Section */}
                    <View style={styles.commentsContainer}>
                        <Text style={styles.commentsTitle}>Comments:</Text>
                        <FlatList
                            data={comments}  // Display the list of comments
                            keyExtractor={(item) => item.id}  // Use comment ID as key
                            renderItem={({ item }) => (
                                <View style={styles.commentCard}>
                                    <Text style={styles.commentText}>
                                        <Text style={styles.commentUser}>{item.username}: </Text>
                                        {item.text}
                                    </Text>
                                    {/* Button to delete comment */}
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDeleteComment(item.id)}
                                    >
                                        <Text style={styles.deleteButtonText}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.commentText}>No comments yet</Text>  // Display when no comments are available
                            }
                        />
                        {/* Input for adding new comment */}
                        <TextInput
                            style={styles.commentInput}
                            placeholder="Write a comment..."
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                        />
                        <Button title="Add Comment" onPress={handleAddComment} />  {/* Button to add comment */}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        alignItems: 'center',
        padding: 20,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 20,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalImage: {
        width: '90%',
        height: '70%',
        resizeMode: 'contain',
    },
    nameText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
        fontFamily: 'Trebuchet MS',
    },
    usernameText: {
        fontSize: 20,
        color: '#888',
        marginBottom: 16,
        fontFamily: 'Trebuchet MS',
    },
    infoText: {
        fontSize: 18,
        color: '#333',
        marginLeft: 8,
        fontFamily: 'Trebuchet MS',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    commentsContainer: {
        width: '100%',
        marginTop: 20,
    },
    commentsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#000',
    },
    commentCard: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
    },
    commentText: {
        fontSize: 16,
        color: '#555',
    },
    commentUser: {
        fontWeight: 'bold',
    },
    deleteButton: {
        marginTop: 8,
        alignSelf: 'flex-end',
        backgroundColor: 'red',
        padding: 6,
        borderRadius: 5,
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    commentInput: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
});

export default ViewProfile;
