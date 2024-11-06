import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginPage from './login';
import ProfilePage from './profile';
import addFriendsPage from './addFriends';
import signUpPage from './signup';
import MainPage from './main';
import CommentsPage from './comments';
import PendingRequestsScreen from "@/app/pendingRequests";

const Stack = createStackNavigator();

const screenOptions = {
    headerStyle: {
        backgroundColor: '#ffffff',
        elevation: 0, // Android
        shadowOpacity: 0, // iOS
        borderBottomWidth: 0,
    },
    headerTitleStyle: {
        fontWeight: '600',
        color: '#1F2937',
    },
    headerTitleAlign: 'center' as const,
    headerBackTitleVisible: false,
    headerTintColor: '#6366F1', // Back button color
};

const noHeaderScreens = {
    headerShown: false,
};

export default function App() {
    return (
        <NavigationContainer independent={true}>
            <Stack.Navigator
                initialRouteName="SignUp"
                screenOptions={screenOptions}
            >
                <Stack.Screen
                    name="Login"
                    component={LoginPage}
                    options={noHeaderScreens}
                />

                <Stack.Screen
                    name="SignUp"
                    component={signUpPage}
                    options={noHeaderScreens}
                />

                <Stack.Screen
                    name="Main"
                    component={MainPage}
                    options={noHeaderScreens}
                />

                <Stack.Screen
                    name="Profile"
                    component={ProfilePage}
                    options={{
                        title: 'Profile',
                        headerStyle: {
                            backgroundColor: '#ffffff',
                        },
                    }}
                />

                <Stack.Screen
                    name="AddFriends"
                    component={addFriendsPage}
                    options={{
                        title: 'Add Friends',
                        headerStyle: {
                            backgroundColor: '#ffffff',
                        },
                    }}
                />

                <Stack.Screen
                    name="PendingRequests"
                    component={PendingRequestsScreen}
                    options={{
                        title: 'Pending Requests',
                        headerStyle: {
                            backgroundColor: '#ffffff',
                        },
                    }}
                />

                <Stack.Screen
                    name="Comments"
                    component={CommentsPage}
                    options={{
                        title: 'Comments',
                        headerStyle: {
                            backgroundColor: '#ffffff',
                        },
                    }}
                />

            </Stack.Navigator>
        </NavigationContainer>
    );
}
