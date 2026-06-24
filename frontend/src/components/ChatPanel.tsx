import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';
import type { ChatMessage } from '../types/game';

interface ChatPanelProps {
  chats: ChatMessage[];
  sendChat: (msg: string) => void;
}

export function ChatPanel({ chats, sendChat }: ChatPanelProps) {
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats, expanded]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    sendChat(msg);
    setMsg('');
  };

  const latestChat = chats.length > 0 ? chats[chats.length - 1] : null;

  return (
    <div className={`flex flex-col bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-300 shadow-2xl ${
      expanded ? 'h-[220px] md:h-auto md:flex-1' : 'h-[52px] shrink-0'
    }`}>
      {/* Header clickable để mở rộng/thu gọn */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={expanded ? 'Thu gọn trò chuyện' : 'Mở rộng trò chuyện'}
        className="w-full py-3 px-4 bg-slate-900/10 hover:bg-slate-900/40 border-b border-slate-850 hover:border-slate-800 transition-colors flex items-center justify-between shrink-0 select-none"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <MessageSquare size={14} className="text-indigo-400" aria-hidden="true" /> Trò chuyện
        </span>
        <div className="flex items-center gap-2">
          {!expanded && latestChat && (
            <span className="text-[9px] text-slate-500 font-medium max-w-[130px] truncate">
              {latestChat.sender}: {latestChat.message}
            </span>
          )}
          {expanded ? <ChevronDown size={14} className="text-slate-500" aria-hidden="true" /> : <ChevronUp size={14} className="text-slate-500" aria-hidden="true" />}
        </div>
      </button>

      {/* Nội dung trò chuyện */}
      {expanded ? (
        <div className="flex-1 flex flex-col p-4 overflow-hidden bg-slate-900/10">
          <div className="flex-grow overflow-y-auto space-y-2 pr-1 mb-3 text-xs">
            {chats.map((chat, idx) => (
              <div key={idx} className="leading-relaxed break-words">
                <span
                  className={`font-bold ${
                    chat.sender === 'Hệ thống' ? 'text-amber-500' : 'text-indigo-455'
                  }`}
                >
                  [{chat.timestamp}] {chat.sender}:
                </span>{' '}
                <span className="text-slate-300">{chat.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
            {chats.length === 0 && (
              <div className="h-full flex items-center justify-center text-slate-600 text-[10px]">
                Chào hỏi đối thủ tại đây!
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-1.5 mt-auto">
            <input
              type="text"
              placeholder="Nhập chat..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              aria-label="Nhập tin nhắn trò chuyện"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
            />
            <button
              type="submit"
              disabled={!msg.trim()}
              aria-label="Gửi tin nhắn"
              className="bg-indigo-650 hover:bg-indigo-550 disabled:opacity-40 p-2 rounded-xl text-white transition-colors"
            >
              <Send size={14} aria-hidden="true" />
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
