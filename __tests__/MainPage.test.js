import MainPage from '../app/main';
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { getDatabase, ref, set, get, remove, onValue } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../config/firebaseConfig';
import { Alert } from 'react-native';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: jest.fn(),
    }),
}));

// Mock Firebase database
jest.mock('firebase/database', () => ({
    getDatabase: jest.fn(),
    ref: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
    onValue: jest.fn(),
}));

// Mock Firebase storage
jest.mock('firebase/storage', () => ({
    getStorage: jest.fn(),
    ref: jest.fn(),
    uploadBytes: jest.fn(),
    getDownloadURL: jest.fn(),
    deleteObject: jest.fn(),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
    requestCameraPermissionsAsync: jest.fn(),
    launchCameraAsync: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock Firebase auth
jest.mock('../config/firebaseConfig', () => ({
    auth: {
        currentUser: {
            uid: 'test-uid',
            displayName: 'Test User',
        },
    },
}));

describe('MainPage Component', () => {
    const mockUser = {
        username: 'Test User',
        profileImage: 'https://example.com/profile.jpg',
    };

    const mockPost = {
        imageUrl: 'https://example.com/image.jpg',
        storagePath: 'images/test.jpg',
        caption: 'Test caption',
        timestamp: Date.now(),
        userName: 'Test User',
        profileImage: 'https://example.com/profile.jpg',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock database responses
        (get as jest.Mock).mockImplementation((ref) => {
            if (ref.toString().includes('users')) {
                return Promise.resolve({
                    exists: () => true,
                    val: () => mockUser,
                });
            } else if (ref.toString().includes('posts')) {
                return Promise.resolve({
                    exists: () => false,
                });
            } else if (ref.toString().includes('friends')) {
                return Promise.resolve({
                    exists: () => false,
                });
            }
            return Promise.resolve({ exists: () => false });
        });

        // Mock onValue
        (onValue as jest.Mock).mockImplementation((ref, callback) => {
            callback({
                exists: () => false,
                val: () => null,
            });
            return () => {};
        });
    });

    it('renders correctly with user data', async () => {
        const { getByText } = render(<MainPage />);

        await waitFor(() => {
            expect(getByText('Welcome back, Test User!')).toBeTruthy();
        });
    });

    it('handles camera permissions and photo capture', async () => {
        // Mock successful camera permissions
        (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce({
            status: 'granted',
        });

        // Mock successful photo capture
        (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
            canceled: false,
            assets: [{ uri: 'file://test/photo.jpg' }],
        });

        const { getByText } = render(<MainPage />);

        await waitFor(() => {
            expect(getByText("Create Today's Post")).toBeTruthy();
        });

        await act(async () => {
            fireEvent.press(getByText("Create Today's Post"));
        });

        expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
        expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    });

    it('handles post creation successfully', async () => {
        // Mock successful upload
        (uploadBytes as jest.Mock).mockResolvedValueOnce({});
        (getDownloadURL as jest.Mock).mockResolvedValueOnce('https://example.com/uploaded.jpg');
        (set as jest.Mock).mockResolvedValueOnce({});

        const { getByText, getByPlaceholderText } = render(<MainPage />);

        // Simulate image capture
        (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
            canceled: false,
            assets: [{ uri: 'file://test/photo.jpg' }],
        });

        await act(async () => {
            fireEvent.press(getByText("Create Today's Post"));
        });

        await waitFor(() => {
            expect(getByPlaceholderText('Write a caption...')).toBeTruthy();
        });

        fireEvent.changeText(getByPlaceholderText('Write a caption...'), 'Test caption');

        await act(async () => {
            fireEvent.press(getByText('Share Post'));
        });

        expect(uploadBytes).toHaveBeenCalled();
        expect(set).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Post created successfully!');
    });

    it('handles expired posts deletion', async () => {
        const expiredPost = {
            ...mockPost,
            timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        };

        // Mock database get for expired post
        (get as jest.Mock).mockImplementationOnce(() => ({
            exists: () => true,
            val: () => expiredPost,
        }));

        const { getByText } = render(<MainPage />);

        await waitFor(() => {
            expect(remove).toHaveBeenCalled();
            expect(deleteObject).toHaveBeenCalled();
        });
    });

    it('prevents multiple posts in one day', async () => {
        const recentPost = {
            ...mockPost,
            timestamp: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
        };

        // Mock database get for recent post
        (get as jest.Mock).mockImplementationOnce(() => ({
            exists: () => true,
            val: () => recentPost,
        }));

        const { getByText } = render(<MainPage />);

        await waitFor(() => {
            expect(getByText("You've already posted today")).toBeTruthy();
        });

        fireEvent.press(getByText("You've already posted today"));

        expect(Alert.alert).toHaveBeenCalledWith(
            'Limit Reached',
            'You can only post once per day. Try again tomorrow!'
        );
    });

    it('handles error during post creation', async () => {
        // Mock upload failure
        (uploadBytes as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'));

        const { getByText, getByPlaceholderText } = render(<MainPage />);

        // Simulate image capture
        (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
            canceled: false,
            assets: [{ uri: 'file://test/photo.jpg' }],
        });

        await act(async () => {
            fireEvent.press(getByText("Create Today's Post"));
        });

        await waitFor(() => {
            expect(getByPlaceholderText('Write a caption...')).toBeTruthy();
        });

        await act(async () => {
            fireEvent.press(getByText('Share Post'));
        });

        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to create post');
    });
});