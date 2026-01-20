
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  groundingLinks?: GroundingLink[];
  suggestedLocation?: {
    lat: number;
    lng: number;
    title?: string;
  };
}

export interface GroundingLink {
  title: string;
  uri: string;
  type: 'search' | 'maps';
}

export interface UserLocation {
  lat: number;
  lng: number;
}
