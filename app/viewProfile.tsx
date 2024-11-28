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
import Icon from 'react-native-vector-icons/FontAwesome';
// @ts-ignore
import defaultPFP from '../assets/images/defaultPFP.png';
import {MaterialCommunityIcons} from "@expo/vector-icons";

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
            <View style={styles.infoContainer}>
                <Icon name="map-pin" size={20} color="#000" />
                <Text style={styles.infoText}>Location: {profileData.location || 'N/A'}</Text>
            </View>
            <View style={styles.infoContainer}>
                <MaterialCommunityIcons name="silverware" size={22} color="#000" />
                <Text style={styles.infoText}>Food Preference: {profileData.foodPreference || 'N/A'}</Text>
            </View>
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
        fontSize: 20,
        color: '#333',
        marginBottom: 8,
        marginTop: 8,
        marginLeft: 4,
        fontFamily: 'Trebuchet MS',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    }
});

export default ViewProfile;
