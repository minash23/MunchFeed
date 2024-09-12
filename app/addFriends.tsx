import React, { useState } from 'react';
import { View, TextInput, Button, Text, FlatList, TouchableOpacity } from 'react-native';
import { searchUsers, addFriend } from './firebase';

const AddFriendsScreen = ({ currentUserId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const handleSearch = async () => {
        const users = await searchUsers(searchTerm);
        setSearchResults(users);
    };

    const handleAddFriend = async (friendUserId) => {
        await addFriend(currentUserId, friendUserId);
        alert('Friend added!');
    };

    return (
        <View>
            <TextInput
                placeholder="Search by email"
                value={searchTerm}
                onChangeText={setSearchTerm}
            />
            <Button title="Search" onPress={handleSearch} />

            <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text>{item.email}</Text>
                        <TouchableOpacity onPress={() => handleAddFriend(item.id)}>
                            <Text style={{ color: 'blue' }}>Add Friend</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
};

export default AddFriendsScreen;
