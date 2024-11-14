import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebaseConfig';
// @ts-ignore
import defaultPFP from '../assets/images/defaultPFP.png';

type RouteParams = {
    userId: string;
};

const ViewProfile = () => {
    const route = useRoute();
    const { userId } = route.params as RouteParams;
    const [profileData, setProfileData] = useState<{
        profileImage?: string;
        firstName: string;
        lastName: string;
        username: string;
        location?: string;
        foodPreference?: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const userRef = ref(database, `users/${userId}`);
                const snapshot = await get(userRef);

                if (snapshot.exists()) {
                    setProfileData(snapshot.val());
                } else {
                    Alert.alert('Error', 'User not found');
                }
            } catch (error) {
                console.error('Error fetching profile data:', error);
                Alert.alert('Error', 'Failed to load profile');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfileData();
    }, [userId]);

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="black" />
            </SafeAreaView>
        );
    }

    if (!profileData) return null;

    return (
        <SafeAreaView style={styles.container}>
            <Image
                source={profileData.profileImage ? { uri: profileData.profileImage } : defaultPFP}
                style={styles.profileImage}
            />
            <Text style={styles.nameText}>
                {profileData.firstName || 'First Name'} {profileData?.lastName || 'Last Name'}
            </Text>
            <Text style={styles.usernameText}>@{profileData.username}</Text>
            <Text style={styles.infoText}>Location: {profileData.location || 'N/A'}</Text>
            <Text style={styles.infoText}>Food Preference: {profileData.foodPreference || 'N/A'}</Text>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 20,
    },
    nameText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#888',
        marginBottom: 8,
    },
    usernameText: {
        fontSize: 18,
        color: '#888',
        marginBottom: 16,
    },
    infoText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
    },
});

export default ViewProfile;
