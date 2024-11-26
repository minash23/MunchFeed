import MainPage from '../src/screens/MainPage';  // adjust based on actual location of MainPage
import { auth } from '../src/config/firebaseConfig';  // adjust based on actual location of firebaseConfig
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MainPage from '../MainPage';  // Adjust path as necessary
import { getDatabase, ref, set, get, remove } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../config/firebaseConfig'; // Adjust import if necessary

// Mocking Firebase and Expo ImagePicker
jest.mock('firebase/database', () => ({
    getDatabase: jest.fn(),
    ref: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
    getStorage: jest.fn(),
    ref: jest.fn(),
    uploadBytes: jest.fn(),
    getDownloadURL: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
    requestCameraPermissionsAsync: jest.fn(),
    launchCameraAsync: jest.fn(),
}));

jest.mock('../config/firebaseConfig', () => ({
    auth: {
        currentUser: { uid: '123', displayName: 'Test User' },
    },
}));

// Sample post data
const samplePost = {
    imageUrl: 'https://sample.com/image.jpg',
    storagePath: 'images/sampleImage.jpg',
    caption: 'Sample Caption',
    timestamp: Date.now(),
    userName: 'Test User',
};


    it('calls handlePost and uploads an image', async () => {
        const mockUploadBytes = jest.fn().mockResolvedValue({});
        const mockGetDownloadURL = jest.fn().mockResolvedValue('https://sample.com/image.jpg');
        const mockSet = jest.fn().mockResolvedValue({});

        // Mock the Firebase methods
        getStorage.mockReturnValue({});
        ref.mockReturnValue({});
        uploadBytes.mockImplementation(mockUploadBytes);
        getDownloadURL.mockImplementation(mockGetDownloadURL);
        set.mockImplementation(mockSet);

        // Mock image picker result
        const mockLaunchCameraAsync = jest.fn().mockResolvedValue({
            canceled: false,
            assets: [{ uri: 'file://path/to/image.jpg' }],
        });
        ImagePicker.launchCameraAsync = mockLaunchCameraAsync;

        const { getByText, getByTestId } = render(<MainPage />);

        // Simulate opening the camera
        fireEvent.press(getByTestId('cameraButton'));

        // Wait for the image to be uploaded
        await waitFor(() => expect(mockUploadBytes).toHaveBeenCalledTimes(1));

        // Simulate submitting the post
        fireEvent.changeText(getByTestId('captionInput'), 'New Caption');
        fireEvent.press(getByTestId('postButton'));

        // Wait for post submission to complete
        await waitFor(() => expect(mockSet).toHaveBeenCalledTimes(1));

        expect(mockSet).toHaveBeenCalledWith(
            expect.objectContaining({
                imageUrl: 'https://sample.com/image.jpg',
                storagePath: 'images/sampleImage.jpg',
                caption: 'New Caption',
                timestamp: expect.any(Number),
                userName: 'Test User',
            })
        );
    });





});