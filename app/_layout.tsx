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
import ViewProfile from "@/app/viewProfile";

const Stack = createStackNavigator();

export default function App() {
  return (
  <NavigationContainer independent={true}>
      <Stack.Navigator initialRouteName= "SignUp">
        <Stack.Screen name="Login" component={LoginPage} />
        <Stack.Screen name="Profile" component={ProfilePage} />
        <Stack.Screen name = "AddFriends" component ={addFriendsPage} />
          <Stack.Screen name = "PendingRequests" component ={PendingRequestsScreen} />
        <Stack.Screen name = "Main" component = {MainPage} />
        <Stack.Screen name = "Comments" component = {CommentsPage}  />
        <Stack.Screen name = "SignUp" component = {signUpPage} />
          <Stack.Screen name = "ViewProfile" component = {ViewProfile} />

      </Stack.Navigator>
   </NavigationContainer>
  );
}
