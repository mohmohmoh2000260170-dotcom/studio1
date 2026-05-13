"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Send, User } from 'lucide-react';
import Link from 'next/link';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { id: 1, text: "السلام عليكم، هل أنت قريب؟", sender: 'me', time: '10:05' },
    { id: 2, text: "وعليكم السلام، نعم 5 دقائق وأصل إليك إن شاء الله", sender: 'other', time: '10:06' },
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (!inputValue.trim()) return;
    setMessages([...messages, { 
      id: Date.now(), 
      text: inputValue, 
      sender: 'me', 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }]);
    setInputValue('');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Chat Header */}
      <header className="bg-white border-b p-4 flex items-center gap-4 shadow-sm">
        <Link href="/customer">
          <Button variant="ghost" size="icon">
            <ArrowRight className="w-6 h-6" />
          </Button>
        </Link>
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="font-bold text-sm">أحمد السائق</h2>
          <p className="text-xs text-green-500 font-medium">متصل الآن</p>
        </div>
      </header>

      {/* Message List */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FBF3EE]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${
              msg.sender === 'me' 
                ? 'bg-primary text-white rounded-tr-none' 
                : 'bg-white text-foreground border rounded-tl-none'
            }`}>
              <p className="text-sm">{msg.text}</p>
              <p className={`text-[10px] mt-1 text-left opacity-70`}>{msg.time}</p>
            </div>
          </div>
        ))}
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t p-4 flex gap-2">
        <Input 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="اكتب رسالتك هنا..." 
          className="flex-1 h-12 rounded-full px-6 bg-slate-50"
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button onClick={handleSend} className="rounded-full w-12 h-12 p-0 bg-primary">
          <Send className="w-5 h-5 rotate-180" />
        </Button>
      </footer>
    </div>
  );
}