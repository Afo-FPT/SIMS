
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

export default function AIChatPage() {
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Intelligence Core online. Ready for logistics analysis.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input;
    setInput('');
    setMessages(p => [...p, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: msg }] },
        config: { systemInstruction: 'You are SWSMS-AI, a technical logistics assistant.' }
      });
      setMessages(p => [...p, { role: 'model', text: response.text || 'Error processing query.' }]);
    } catch (e) {
      console.error(e);
      setMessages(p => [...p, { role: 'model', text: 'Connection to AI Core failed. Please ensure your API Key is valid.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-14rem)] bg-white rounded-5xl border border-slate-200 shadow-2xl overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`p-5 rounded-4xl max-w-[80%] text-sm font-medium ${
              m.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-slate-50 text-slate-700 rounded-tl-none border border-slate-100'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="p-5 bg-slate-50 rounded-4xl rounded-tl-none border border-slate-100 flex gap-1">
              <span className="size-2 bg-primary/40 rounded-full animate-bounce"></span>
              <span className="size-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="size-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>
      <div className="p-8 border-t border-slate-100 bg-white">
        <div className="relative flex items-center">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Operational query..."
            className="w-full h-16 pl-8 pr-16 bg-slate-50 border border-slate-200 rounded-4xl focus:bg-white transition-all outline-none font-bold"
          />
          <button onClick={handleSend} disabled={loading} className="absolute right-3 size-11 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg disabled:opacity-50">
            <span className="material-symbols-outlined">arrow_upward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
