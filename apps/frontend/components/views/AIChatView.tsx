
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Persona } from '../../types';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const AIChatView: React.FC<{ persona: Persona }> = ({ persona }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: `Intelligence Core initialized. I am your SWSMS-AI Operational Assistant. Ready to analyze ${persona === 'ADMIN' ? 'infrastructure logs' : 'warehouse throughput'} patterns. What is your query?` }
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
          { role: 'user', parts: [{ text: `System Context: SWSMS-AI Logistics. User Role: ${persona}. Provide technical operational support.` }] },
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: `You are the SWSMS-AI Intelligence Core. Use technical terminology (SKU, SLA, throughput). Keep responses professional and data-driven. Limit to 150 words. Format lists with bullet points.`,
        },
      });

      const text = response.text || "Operational core timed out. Please retry.";
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Critical infrastructure link failed. Intelligence engine is currently unreachable." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    { label: 'Throughput Audit', text: 'Generate a throughput audit for Zone A for the last 24 hours.' },
    { label: 'Pathing Optimization', text: 'Analyze pathing bottlenecks in the North Terminal.' },
    { label: 'Inventory Drift', text: 'Are there any SKU drift anomalies detected this week?' }
  ];

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-14rem)] bg-white rounded-5xl border border-slate-200/60 shadow-2xl overflow-hidden animate-in fade-in duration-700">
      <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
            <span className="material-symbols-outlined">smart_toy</span>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Intelligence Stream</h3>
            <p className="text-[9px] text-emerald-600 font-black uppercase tracking-tighter">Active Node • Gemini 3 Flash</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Encrypted Channel</span>
           <button className="size-8 rounded-xl bg-slate-100 text-slate-400 hover:text-primary transition-colors flex items-center justify-center">
             <span className="material-symbols-outlined text-[18px]">history</span>
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`flex gap-5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-primary text-white'
              }`}>
                <span className="material-symbols-outlined text-2xl">{msg.role === 'user' ? 'person' : 'database'}</span>
              </div>
              <div className={`p-6 rounded-4xl shadow-sm text-[15px] leading-relaxed font-medium ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-none prose prose-slate max-w-none'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="flex gap-5">
                <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center animate-pulse">
                  <span className="material-symbols-outlined text-2xl">smart_toy</span>
                </div>
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-4xl rounded-tl-none flex items-center gap-2">
                   <span className="size-2 bg-primary/20 rounded-full animate-bounce"></span>
                   <span className="size-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                   <span className="size-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="p-8 border-t border-slate-100 bg-white space-y-6 shrink-0">
        <div className="flex flex-wrap gap-2.5">
           {suggestions.map((s, i) => (
             <button 
                key={i} 
                onClick={() => setInput(s.text)}
                className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all"
              >
                {s.label}
             </button>
           ))}
        </div>
        
        <div className="relative flex items-center">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Describe your operational goal or query..."
            className="w-full pl-8 pr-16 h-20 bg-slate-50/50 border border-slate-200 rounded-4xl focus:ring-8 focus:ring-primary/5 focus:border-primary focus:bg-white transition-all outline-none text-[15px] font-bold placeholder:text-slate-400"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="absolute right-3.5 size-13 bg-primary text-white rounded-[1.8rem] flex items-center justify-center shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all group"
          >
            <span className="material-symbols-outlined text-[28px] group-hover:-translate-y-1 transition-transform">arrow_upward</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatView;
