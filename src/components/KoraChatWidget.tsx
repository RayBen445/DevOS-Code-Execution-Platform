import React, { useState } from 'react';
import { postKoraChat } from '../lib/kora-api';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function KoraChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await postKoraChat({
        messages: newMessages,
        stream: false // Using non-streaming for simplicity unless stream parser is added
      });
      
      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        setMessages([...newMessages, data.choices[0].message]);
      }
    } catch (error) {
      console.error('KORA Chat Error:', error);
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/50 backdrop-blur-md rounded-xl border border-white/10 p-4">
      {/* Messages rendering */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-blue-400' : 'text-gray-200'}>
            <strong>{m.role === 'user' ? 'You' : 'KORA'}:</strong> {m.content}
          </div>
        ))}
        {isLoading && <div className="text-gray-400">KORA is typing...</div>}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask KORA to write some code..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-blue-500 transition-colors"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
