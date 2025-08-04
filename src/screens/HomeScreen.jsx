import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import * as RNFS from 'react-native-fs';
import { useNavigation } from '@react-navigation/native';
import chatLogo from '../assets/chatLogo.png';

const OPENAI_API_KEY = '';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [photo, setPhoto] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!photo || !photo.base64) {
      alert('Please upload a photo first!');
      return;
    }

    setLoading(true);
    try {
      const base64Image = `data:${photo.type};base64,${photo.base64}`;
      ``;
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Give a product title and short description for this image.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image,
                  },
                },
              ],
            },
          ],
          max_tokens: 300,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
        },
      );

      const aiText = response.data.choices[0].message.content;
      // Filter out empty lines and separator lines like '***' or '---'
      const lines = aiText
        .split('\n')
        .filter(line => line.trim() && !/^[\*-_=\s]+$/.test(line.trim()));

      const [rawTitle, ...rawDescLines] = lines;

      // Clean up title (remove "Title:" prefix and markdown)
      const cleanedTitle = rawTitle
        ? rawTitle
            .replace(/^(title:)\s*/i, '')
            .replace(/[\*_]/g, '')
            .trim()
        : '';

      // Clean up description (remove "Description:" prefix)
      const cleanedDescription = rawDescLines
        .join(' ')
        .replace(/^(description:)\s*/i, '')
        .trim();

      setTitle(cleanedTitle);
      setDescription(cleanedDescription);
    } catch (error) {
      console.error(error.response?.data || error.message);
      alert('Failed to generate description');
    }
    setLoading(false);
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        console.log('Android version:', Platform.Version);
        if (Platform.Version >= 33) {
          console.log('Requesting READ_MEDIA_IMAGES permission');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            {
              title: 'Media Permission',
              message: 'App needs access to your images to select photos.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          console.log('READ_MEDIA_IMAGES permission result:', granted);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              'Permission denied',
              'READ_MEDIA_IMAGES permission was denied: ' + granted,
            );
          }
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          console.log('Requesting READ_EXTERNAL_STORAGE permission');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'Storage Permission',
              message: 'App needs access to your storage to select images.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          console.log('READ_EXTERNAL_STORAGE permission result:', granted);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              'Permission denied',
              'READ_EXTERNAL_STORAGE permission was denied: ' + granted,
            );
          }
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.warn('Permission error:', err);
        Alert.alert('Permission error', String(err));
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestStoragePermission();
    console.log('Has permission:', hasPermission);
    if (!hasPermission) {
      Alert.alert('Permission denied', 'Cannot access storage.');
      return;
    }
    try {
      console.log('pickImage called');
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
      });
      console.log('Image picker result:', result);
      if (result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setPhoto(result.assets[0]); // Update state with the full asset object
        setTitle('');
        setDescription('');
      }
    } catch (error) {
      console.error('Image selection error:', error);
      Alert.alert('Error', 'Image selection failed.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#181818" />
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('AIChat')}
        >
          <Image source={chatLogo} style={styles.chatButtonIcon} />
        </TouchableOpacity>
        <Text style={styles.header}>Upload Product Photo</Text>

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          <Text style={styles.imagePickerText}>Tap to select a photo</Text>
        </TouchableOpacity>

        {photo && (
          <Image source={{ uri: photo.uri }} style={styles.imagePreview} />
        )}

        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerate}
        >
          <Text style={styles.generateText}>Generate Details</Text>
        </TouchableOpacity>

        {loading && (
          <ActivityIndicator
            size="large"
            color="#e74c3c"
            style={{ marginTop: 20 }}
          />
        )}

        {title !== '' && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>{title}</Text>
            <Text style={styles.resultContent}>{description}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#181818',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#181818', // dark background
    justifyContent: 'center',
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#fff',
    letterSpacing: 1,
  },
  chatButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#e74c3c',
    width: 50,
    height: 50,
    borderRadius: 25,
    zIndex: 1,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden', // Ensure the image stays within the circle
  },
  chatButtonIcon: {
    width: '100%',
    height: '100%',
  },
  imagePicker: {
    backgroundColor: '#e74c3c', // red accent
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  imagePickerText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  imagePreview: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e74c3c', // red border
    backgroundColor: '#222',
  },
  generateButton: {
    backgroundColor: '#222',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e74c3c', // red border
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  generateText: {
    color: '#e74c3c',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  resultBox: {
    paddingVertical: 10,
    marginTop: 10,
  },
  resultTitle: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e74c3c',
    overflow: 'hidden',
  },
  resultContent: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
    overflow: 'hidden',
  },
});

export default HomeScreen;
