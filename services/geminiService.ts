
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, GroundingLink } from "../types";

const API_KEY = process.env.API_KEY || '';

export const queryGemini = async (
  prompt: string,
  location?: { lat: number; lng: number },
  history: Message[] = []
): Promise<{ text: string; links: GroundingLink[]; coords?: { lat: number; lng: number } }> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // 1. Decide which tool to use. 
  // If it sounds like a local search, use Google Maps grounding (Gemini 2.5 series).
  // If it sounds like recent news or general web info, use Google Search (Gemini 3).
  // Otherwise, use Gemini 3 Pro for complex chat.

  const isLocationSearch = /near|close|nearby|at|around|restaurant|coffee|park|gas station|hotel/i.test(prompt);
  const isGeneralInfo = /news|weather|current|event|latest|today|who won/i.test(prompt);

  try {
    if (isLocationSearch) {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite-latest",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: location ? { latitude: location.lat, longitude: location.lng } : undefined,
            }
          }
        },
      });

      const links: GroundingLink[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      chunks.forEach((chunk: any) => {
        if (chunk.maps) {
          links.push({
            title: chunk.maps.title,
            uri: chunk.maps.uri,
            type: 'maps'
          });
        }
      });

      // Simple heuristic to extract potential lat/lng if we want to update the map
      // but the API doesn't return raw coordinates in a standard format to us.
      // We could do a second pass if needed, but for now we rely on the grounding metadata display.
      
      return {
        text: response.text || "I found some places for you.",
        links: links,
      };
    } else if (isGeneralInfo) {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const links: GroundingLink[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          links.push({
            title: chunk.web.title,
            uri: chunk.web.uri,
            type: 'search'
          });
        }
      });

      return {
        text: response.text || "Here is what I found from the web.",
        links: links,
      };
    } else {
      // General conversation
      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: 'You are a helpful travel and local guide assistant. You can help users find information about locations, news, and more. When asked about places, encourage the user to specify their location or use the map.',
        },
      });

      // Add simple history
      let lastResponse;
      if (history.length > 0) {
        // Send previous messages if relevant, simplified for this demo
        lastResponse = await chat.sendMessage({ message: prompt });
      } else {
        lastResponse = await chat.sendMessage({ message: prompt });
      }

      return {
        text: lastResponse.text || "How can I help you today?",
        links: [],
      };
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
