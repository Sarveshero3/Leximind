import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const API_ENDPOINT = 'YOUR_API_ENDPOINT_HERE';
const { width } = Dimensions.get('window');

const TypingIndicator = () => {
  const [dot1] = useState(new Animated.Value(0));
  const [dot2] = useState(new Animated.Value(0));
  const [dot3] = useState(new Animated.Value(0));

  useEffect(() => {
    const animateDot = (dot, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 200);
    animateDot(dot3, 400);
  }, []);

  const dotStyle = (animation) => ({
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -5],
        }),
      },
    ],
  });

  return (
    <View style={styles.typingIndicator}>
      <Animated.View style={[styles.dot, dotStyle(dot1)]} />
      <Animated.View style={[styles.dot, dotStyle(dot2)]} />
      <Animated.View style={[styles.dot, dotStyle(dot3)]} />
    </View>
  );
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadMessages();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadMessages = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem('visualingoMessages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const saveMessages = async (newMessages) => {
    try {
      await AsyncStorage.setItem('visualingoMessages', JSON.stringify(newMessages));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  const sendMessage = useCallback(async () => {
    if (inputText.trim() === '') return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage = { text: inputText, user: true };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);
    saveMessages(newMessages);

    try {
      const response = await axios.post(API_ENDPOINT, {
        message: inputText,
      });

      setIsTyping(false);
      const botMessage = { text: response.data.reply, user: false };
      const updatedMessages = [...newMessages, botMessage];
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
    } catch (error) {
      setIsTyping(false);
      console.error('Error sending message:', error);
      const errorMessage = { text: "Sorry, I couldn't process that. Please try again.", user: false };
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
    }
  }, [inputText, messages]);

  const renderMessage = useCallback(({ item, index }) => {
    return (
      <Animated.View
        style={[
          styles.messageBubble,
          item.user ? styles.userMessage : styles.botMessage,
          { opacity: fadeAnim }
        ]}
      >
        <BlurView intensity={80} tint={item.user ? "light" : "dark"} style={styles.blurView}>
          <Text style={[styles.messageText, item.user ? styles.userMessageText : styles.botMessageText]}>
            {item.text}
          </Text>
        </BlurView>
      </Animated.View>
    );
  }, [fadeAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>VisuaLingo</Text>
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            style={styles.messagesContainer}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
          >
            {messages.map((message, index) => renderMessage({ item: message, index }))}
            {isTyping && <TypingIndicator />}
          </ScrollView>
          <BlurView intensity={100} tint="light" style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              placeholderTextColor="#999"
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Ionicons name="send" size={24} color="#ffffff" />
            </TouchableOpacity>
          </BlurView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-condensed',
    paddingTop: Platform.OS === 'ios' ? 0 : 30,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  messageBubble: {
    maxWidth: width * 0.75,
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
    overflow: 'hidden',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  blurView: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 10,
  },
  messageText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  userMessageText: {
    color: '#000000',
  },
  botMessageText: {
    color: '#ffffff',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginBottom: 10,
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    marginHorizontal: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
});