
import React, { useState, useRef, useEffect } from 'react';
import { Message, GroundingLink } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
              <i className="fa-solid fa-earth-americas"></i>
            </span>
            GeoGemini
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Location-aware AI assistant</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Live Engine</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-8 space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-2xl">
              <i className="fa-regular fa-comments"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Start your exploration</h2>
              <p className="text-sm text-gray-500 max-w-xs mt-1">
                Ask about nearby spots, local news, or anything else. Drag the map pin to update your search center.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {['What are the best coffee shops nearby?', 'Top news in this area today', 'Find a quiet park around here'].map(prompt => (
                    <button 
                        key={prompt}
                        onClick={() => onSendMessage(prompt)}
                        className="text-left px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 hover:text-blue-600"
                    >
                        "{prompt}"
                    </button>
                ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'
            }`}>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              
              {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300/30 flex flex-wrap gap-2">
                  {msg.groundingLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-[10px] px-2 py-1 rounded-full flex items-center gap-1.5 transition-all ${
                        msg.role === 'user'
                          ? 'bg-blue-700/50 hover:bg-blue-800/50 text-white'
                          : 'bg-white hover:bg-gray-200 text-gray-700 border border-gray-200'
                      }`}
                    >
                      <i className={link.type === 'maps' ? 'fa-solid fa-location-dot' : 'fa-solid fa-globe'}></i>
                      <span className="truncate max-w-[120px]">{link.title}</span>
                      <i className="fa-solid fa-arrow-up-right-from-square text-[8px] opacity-60"></i>
                    </a>
                  ))}
                </div>
              )}
              
              <div className={`text-[9px] mt-1 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSubmit} className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search nearby, news, or ask anything..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-12"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <i className="fa-solid fa-paper-plane text-xs"></i>
          </button>
        </form>
        <p className="text-[10px] text-gray-400 text-center mt-3">
          Powered by Gemini 3 & Google Grounding Technologies
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
