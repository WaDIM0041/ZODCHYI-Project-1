
import React, { useState, useEffect, useCallback } from 'react';
import { Message, UserLocation } from './types';
import ChatInterface from './components/ChatInterface';
import MapView from './components/MapView';
import { queryGemini } from './services/geminiService';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation>({
    lat: 34.052235, // Default LA
    lng: -118.243683
  });

  // Get