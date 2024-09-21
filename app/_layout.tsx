import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginPage from './login';
import ProfilePage from './profile';
import addFriendsPage from './addFriends';
import signUpPage from './signup';
import MainPage from './main';

const Stack = createStackNavigator();

export default function App() {
  return (
  <NavigationContainer independent={true}>
      <Stack.Navigator initialRouteName= "Main">
        <Stack.Screen name="Login" component={LoginPage} />
        <Stack.Screen name="Profile" component={ProfilePage} />
        <Stack.Screen name = "AddFriends" component ={addFriendsPage} />
        <Stack.Screen name = "Main" component = {MainPage} />
        <Stack.Screen name = "SignUp" component = {signUpPage} />
      </Stack.Navigator>
   </NavigationContainer>
  );
}
