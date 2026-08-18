import React, { useState } from 'react';
import api from '../services/api';

interface Message {
  text: string;
  isUser: boolean;
}

const ChatAsistente: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { text: 'Hola, soy tu asistente de salud. ¿Cómo te sientes hoy? Estoy aquí para apoyarte.', isUser: false },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { text: userMessage, isUser: true }]);
    setLoading(true);

    try {
      const res = await api.post('chat/', { mensaje: userMessage });
      const botResponse = res.data.respuesta;
      setMessages((prev) => [...prev, { text: botResponse, isUser: false }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { text: 'Lo siento, no pude conectarme al servidor del asistente. Por favor, intenta de nuevo.', isUser: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative font-sans text-slate-800">
      
      {/* Chat window - Glassmorphic */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 h-[450px] bg-white/90 backdrop-blur-xl border border-white/50 rounded-3xl shadow-xl flex flex-col overflow-hidden mb-4 transition-all duration-300 ease-out animate-slide-up z-50">
          
          {/* Header - Government gradient */}
          <div className="p-4 bg-gradient-to-r from-gob-blue to-gob-celeste flex justify-between items-center text-white">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
              <span className="font-bold text-sm">Asistente TUSALUDgt</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition focus:outline-none font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col bg-white/40">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.isUser
                    ? 'bg-gob-blue text-white align-self-end self-end rounded-tr-none shadow-sm'
                    : 'bg-slate-100/80 text-slate-850 self-start rounded-tl-none border border-slate-200/50 shadow-sm'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="bg-slate-100/80 text-slate-700 self-start p-3 rounded-2xl rounded-tl-none border border-slate-200/50 text-xs flex items-center space-x-1 shadow-sm">
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-slate-50/50 flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta..."
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-gob-blue text-slate-800 text-xs transition-all"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gob-blue hover:bg-gob-blue/90 border border-gob-celeste text-white font-bold rounded-2xl text-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-95 shadow-sm"
            >
              Enviar
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gob-blue/90 text-white backdrop-blur-md shadow-lg shadow-gob-blue/25 flex items-center justify-center rounded-full hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none border border-white/20 text-2xl ml-auto"
      >
        💬
      </button>
    </div>
  );
};

export default ChatAsistente;
