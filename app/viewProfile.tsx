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
    Platform, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { ref, get, push, onValue, remove } from 'firebase/database';
import { auth, database } from '../config/firebaseConfig';
import Icon from 'react-native-vector-icons/FontAwesome'; // FontAwesome icon for location
// @ts-ignore
import defaultPFP from '../assets/images/defaultPFP.png'; // Default profile image if none is provided
import { MaterialCommunityIcons } from '@expo/vector-icons'; // MaterialCommunityIcons for food preference
import { Ionicons } from '@expo/vector-icons';

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
    timestamp: number; // Timestamp when the comment was created
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

        //fetch comments of profile
        const fetchComments = () => {
            const commentsRef = ref(database, `users/${userId}/comments`);
            onValue(commentsRef, (snapshot) => {
                const fetchedComments: Comment[] = [];
                snapshot.forEach((childSnapshot) => {
                    fetchedComments.push({
                        id: childSnapshot.key!, // Comment ID
                        text: childSnapshot.val().text, // Comment text
                        username: childSnapshot.val().username, // Comment author's username
                        timestamp: childSnapshot.val().timestamp, // Comment timestamp
                    });
                });
                setComments(fetchedComments); // Set comments in state
            });
        };

        fetchProfileData(); // Fetch profile data
        fetchComments(); // Fetch comments

        // Set up a periodic function to check for old comments and delete them
        const intervalId = setInterval(() => {
            deleteOldComments();  // Call the function to delete old comments
        }, 60 * 60 * 1000); // Check every hour (60 minutes)

        // Cleanup the interval on component unmount
        return () => clearInterval(intervalId);

    }, [userId]); // Re-run effect when userId changes

    // Function to handle adding a new comment
    const handleAddComment = async () => {
        if (!newComment.trim()) {
            Alert.alert('Error', 'Comment cannot be empty');  // Alert if comment is empty
            return;
        }

        try {
            const commentsRef = ref(database, `users/${userId}/comments`);
            await push(commentsRef, {
                text: newComment.trim(),
                username: 'Anonymous',
                timestamp: Date.now(), // Add the current timestamp
            }); // Add new comment to Firebase
            setNewComment(''); // Clear the input field
            Keyboard.dismiss();
        } catch (error) {
            console.error('Error adding comment:', error);
            Alert.alert('Error', 'Failed to add comment');
        }
    };

    // Function to handle deleting a comment
    const handleDeleteComment = async (commentId: string) => {
        const currentUserId = auth.currentUser?.uid;
        if (currentUserId !== userId) {
            Alert.alert('Error', 'You can only delete comments from your own profile.');
            return;
        }

        Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const commentRef = ref(database, `users/${userId}/comments/${commentId}`);
                            await remove(commentRef); // Remove the comment from Firebase
                        } catch (error) {
                            console.error('Error deleting comment:', error);
                            Alert.alert('Error', 'Failed to delete comment');
                        }
                    },
                },
            ]
        );
    };


    // Function to delete comments older than 24 hours
    const deleteOldComments = () => {
        const currentTime = Date.now();
        comments.forEach((comment) => {
            const timeElapsed = currentTime - comment.timestamp;
            const twentyFourHours = 86400000; // 24 hours in milliseconds
            if (timeElapsed > twentyFourHours) {
                handleDeleteComment(comment.id); // Delete comment if older than 24 hours
            }
        });
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={50}
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
                        /><TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setIsModalVisible(false)}
                    >
                        <Text style={styles.closeText}>Close</Text>
                    </TouchableOpacity>
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

                        {/* Make the comments section scrollable */}
                        <ScrollView style={styles.commentList}>
                            {comments.map((comment) => (
                                <View key={comment.id} style={styles.commentCard}>
                                    <Text style={styles.commentText}>
                                        <Text style={styles.commentUser}>{comment.username}: </Text>
                                        {comment.text}
                                    </Text>
                                    {/* Button to delete comment, only shows if looking at own profile */}
                                    {auth.currentUser?.uid === userId && (
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => handleDeleteComment(comment.id)}
                                        >
                                            <Ionicons name="trash" size={16} color="white" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </ScrollView>
                {/* Add comment input section */}
                <View style={styles.commentInputContainer}>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Add a comment..."
                        placeholderTextColor={'#A9A9A9AC'}
                        value={newComment}
                        onChangeText={setNewComment}
                        returnKeyType="send"
                        onSubmitEditing={handleAddComment}
                    />
                    <TouchableOpacity
                        onPress={handleAddComment}
                        style={styles.iconButton}
                        disabled={!newComment.trim()}
                    >
                        <Ionicons name="send" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

// Styles for the profile screen
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: 'white',
    },
    scrollContent: {
        alignItems: 'center',
    },
    profileImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalImage: {
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    nameText: {
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
    },
    usernameText: {
        fontSize: 18,
        color: 'gray',
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    infoText: {
        marginLeft: 10,
        fontSize: 16,
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
    },
    commentsContainer: {
        marginTop: 20,
        width: '100%',
    },
    commentsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
    },
    commentCard: {
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    commentText: {
        fontSize: 16,
        flex: 1,
        marginRight: 10,
    },
    commentUser: {
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
    },
    deleteButton: {
        width: 24,
        height: 24,
        backgroundColor: '#ff4d4d',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentInput: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        paddingLeft: 15,
        marginRight: 10,
    },
    commentInputContainer: {
        flexDirection: 'row',
        width: '100%',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        alignItems: 'center',
    },
    iconButton: {
        padding: 10,
        borderRadius: 50,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        margin: 15,
        backgroundColor: 'black',
        borderRadius: 25,
        padding: 15,
        alignItems: 'center',
    },
    closeText: {
        color: 'white',
        fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'Roboto',
        fontSize: 16,
        fontWeight: '600',
    },
});


export default ViewProfile;
