import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../config/firebaseConfig'; // Ensure Firebase auth is initialized properly

// Image assets
import Logo from '../assets/images/adaptive-icon.png';

export default function MainPage() {
    const user = auth.currentUser; // Ensure the current user is retrieved from Firebase Auth
    const uid = user ? user.uid : 'Guest'; //will remove once we have real navigation

    // pull real data from firebase
    const friendsPosts = [
        { id: 1, name: 'Mike Johnson', meal: 'Pancakes for breakfast', imageUrl: 'https://www.allrecipes.com/thmb/WqWggh6NwG-r8PoeA3OfW908FUY=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/21014-Good-old-Fashioned-Pancakes-mfs_001-1fa26bcdedc345f182537d95b6cf92d8.jpg' },
        { id: 2, name: 'Emily White', meal: 'Sushi for dinner', imageUrl: 'https://cdn.britannica.com/52/128652-050-14AD19CA/Maki-zushi.jpg' },
        // Add more friends with images as needed
    ];

    return (
        <SafeAreaView style={styles.container}>
            {/* Logo at the top */}
            <Image source={Logo} style={styles.logo} />

            {/* Scrollable View */}
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {/* Welcome Message */}
                <Text style={styles.welcomeText}>Welcome to MunchFeed, {uid}!</Text>

                {/* Friends' pages with their meal images */}
                {friendsPosts.map(friend => (
                    <View key={friend.id} style={styles.friendCard}>
                        <Text style={styles.friendName}>{friend.name}</Text>
                        <Image
                            source={{ uri: friend.imageUrl }}
                            style={styles.mealImage}
                            resizeMode="cover"
                        />
                        <Text style={styles.mealText}>{friend.meal}</Text>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    logo: {
        width: 100,
        height: 100,
        alignSelf: 'center',
        marginTop: -40,
        marginBottom: -20,
    },
    scrollContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    welcomeText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    friendCard: {
        backgroundColor: '#fff',
        padding: 20,
        marginBottom: 15,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    friendName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    mealImage: {
        width: '100%',
        height: 200, // Adjust height as needed
        borderRadius: 10,
        marginBottom: 10,
    },
    mealText: {
        fontSize: 14,
        textAlign: 'center',
    },
});
