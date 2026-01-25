
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Persona } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const AIChatAssistant: React.FC<{ persona: Persona }> = ({ persona }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: `Intelligence Core initialized. I am your SWSMS-AI Operational Assistant. Analyzing current ${persona === 'ADMIN' ? 'infrastructure logs' : 'warehouse throughput'} patterns. How shall we proceed?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [{ text: `System Context: SWSMS-AI Logistics. Current User: ${persona}.` }] },
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: `You are the SWSMS-AI Intelligence Core. 
          Provide professional, data-driven, and technical logistics support. 
          Keep responses concise (under 150 words). 
          Use technical terms like SKU, SLI, throughput, and cross-docking where appropriate. 
          Format structured data in clean Markdown lists.`,
        },
      });

      const text = response.text || "Operational core timed out. Please retry.";
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      console.error("AI Core Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Critical infrastructure link failed. Check your API configuration." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const prompts = [
    { label: 'Zone A Report', text: 'Run a diagnostic on Zone A throughput bottlenecks.' },
    { label: 'Low Stock SKU', text: 'Which items are currently below 15% shelf threshold?' },
    { label: 'Layout Check', text: 'Recommend layout optimizations for the South Terminal.' }
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-12rem)] bg-white rounded-5xl border border-slate-200/60 shadow-2xl shadow-slate-200/40 overflow-hidden animate-in fade-in duration-700">
      <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
            <span className="material-symbols-outlined text-xl">smart_toy</span>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">SWSMS-AI Intelligence</h3>
            <p className="text-[9px] text-emerald-600 font-black uppercase tracking-tighter">Gemini 3 Flash • Active</p>
          </div>
        </div>
        <button className="p-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-xl">history</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`size-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-primary text-white'
              }`}>
                <span className="material-symbols-outlined text-xl">
                  {msg.role === 'user' ? 'person' : 'database'}
                </span>
              </div>
              <div className={`p-5 rounded-[2rem] shadow-sm text-sm leading-relaxed font-medium ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-none prose prose-sm prose-slate max-w-none'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-4">
              <div className="size-10 rounded-2xl bg-primary text-white flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-xl">smart_toy</span>
              </div>
              <div className="p-5 bg-slate-50 rounded-[2rem] rounded-tl-none flex items-center gap-1.5">
                <span className="size-2 bg-primary/20 rounded-full animate-bounce"></span>
                <span className="size-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="size-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 border-t border-slate-100 bg-white space-y-6">
        <div className="flex flex-wrap gap-3">
          {prompts.map((p, idx) => (
            <button 
              key={idx}
              onClick={() => setInput(p.text)}
              className="px-5 py-2.5 bg-slate-50 hover:bg-primary/5 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-500 hover:text-primary transition-all uppercase tracking-widest"
            >
              {p.label}
            </button>
          ))}
        </div>
        
        <div className="relative flex items-center">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Operational query..."
            className="w-full pl-8 pr-16 h-16 bg-slate-50 border border-slate-200 rounded-[2.5rem] focus:ring-4 focus:ring-primary/5 focus:border-primary focus:bg-white transition-all outline-none text-sm font-bold"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 size-11 bg-primary text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined text-2xl">arrow_upward</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatAssistant;
