import { useState } from 'react';
import type { FormEvent } from 'react';
import { Users, Key, Play, MessageSquare, Send, Copy, Check, Settings } from 'lucide-react';
import type { Player, ChatMessage, RoomSettings } from '../types/game';
import { TOKEN_SKINS, BOARD_SKINS, DICE_SKINS } from '../data/skins';

interface GameLobbyProps {
  roomCode: string;
  players: Player[];
  playerId: string;
  hostId: string;
  chats: ChatMessage[];
  connected: boolean;
  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
  startGame: () => void;
  sendChat: (msg: string) => void;
  roomSettings: RoomSettings | null;
  selectSkin: (tokenSkin: string) => void;
  updateRoomSettings: (settings: Partial<RoomSettings>) => void;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full text-xs font-semibold text-slate-300 bg-slate-950/50 border border-slate-800 rounded-lg px-2.5 py-2 hover:border-slate-600 transition"
    >
      <span>{label}</span>
      <span className={`w-8 h-4 rounded-full relative transition ${checked ? 'bg-emerald-500' : 'bg-slate-700'}`}>
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

const DEFAULT_SETTINGS: RoomSettings = {
  startingMoney: 1500,
  gameMode: 'classic',
  houseRules: { freeParkingJackpot: false, doubleGo: false, turnTimerSec: null },
  boardSkin: 'neon',
  diceSkin: 'neon',
};

export function GameLobby({
  roomCode,
  players,
  playerId,
  hostId,
  chats,
  connected,
  createRoom,
  joinRoom,
  startGame,
  sendChat,
  roomSettings,
  selectSkin,
  updateRoomSettings,
}: GameLobbyProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const isHost = playerId === hostId;
  const settings = roomSettings ?? DEFAULT_SETTINGS;
  const mySkin = players.find((p) => p.id === playerId)?.tokenSkin;

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createRoom(name);
  };

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    joinRoom(code, name);
  };

  const handleSendChat = (e: FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    sendChat(chatMsg);
    setChatMsg('');
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Màn hình nhập tên & mã phòng (Chưa vào phòng)
  if (!roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-950 to-black p-4">
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent uppercase animate-pulse">
              Cờ Tỷ Phú Online
            </h1>
            <p className="text-slate-400 mt-2 text-sm font-medium">Phiên bản Web Multiplayer Realtime (MVP)</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">
                Tên hiển thị của bạn
              </label>
              <input
                type="text"
                placeholder="Nhập tên..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={15}
                aria-label="Tên hiển thị của bạn"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                disabled={!name.trim() || !connected}
                onClick={handleCreate}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-lg hover:shadow-indigo-600/20 active:scale-[0.98]"
              >
                <Play size={18} />
                Tạo Phòng
              </button>

              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Mã phòng..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  aria-label="Mã phòng để tham gia"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-1.5 text-center text-slate-100 placeholder-slate-600 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  disabled={!name.trim() || !code.trim() || !connected}
                  onClick={handleJoin}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-1.5 px-4 rounded-2xl transition-all shadow-lg hover:shadow-emerald-600/20 active:scale-[0.98]"
                >
                  <Key size={16} />
                  Tham Gia
                </button>
              </div>
            </div>

            {!connected && (
              <p className="text-center text-red-400 text-xs mt-4 animate-pulse">
                Đang kết nối tới máy chủ game...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Màn hình phòng chờ (Đã vào phòng)
  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-950 to-black p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
        
        {/* Cột trái: Người chơi & Mã phòng */}
        <div className="flex flex-col justify-between p-2">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <Users className="text-indigo-400" aria-hidden="true" /> Phòng Chờ
              </h2>
              <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-850 px-4 py-2 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold uppercase">Mã:</span>
                <span className="text-lg font-bold text-cyan-400 tracking-widest">{roomCode}</span>
                <button
                  onClick={copyRoomCode}
                  className="text-slate-500 hover:text-slate-200 transition-colors p-1"
                  title="Sao chép mã phòng"
                  aria-label="Sao chép mã phòng"
                >
                  {copied ? <Check size={16} className="text-green-400" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Thành viên ({players.length}/6)
              </label>
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-slate-950/55 border border-slate-800/80 px-4 py-3 rounded-2xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="font-semibold text-slate-200">
                      {player.name} {player.id === playerId && <span className="text-indigo-400 text-xs font-normal">(bạn)</span>}
                    </span>
                  </div>
                  {player.id === hostId ? (
                    <span className="text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Chủ phòng
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Sẵn sàng
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Chọn quân cờ (skin) */}
            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Chọn quân cờ</label>
              <div className="grid grid-cols-8 gap-1.5">
                {TOKEN_SKINS.map((skin) => {
                  const takenByOther = players.some((p) => p.tokenSkin === skin.id && p.id !== playerId);
                  const mine = mySkin === skin.id;
                  return (
                    <button
                      key={skin.id}
                      title={skin.name}
                      aria-label={`Chọn quân cờ ${skin.name}${takenByOther ? ' (đã bị chọn)' : mine ? ' (đang chọn)' : ''}`}
                      disabled={takenByOther}
                      onClick={() => selectSkin(skin.id)}
                      className={`aspect-square rounded-xl text-xl flex items-center justify-center border transition ${
                        mine
                          ? 'border-indigo-500 bg-indigo-500/20 ring-1 ring-indigo-400'
                          : takenByOther
                          ? 'border-slate-850 bg-slate-950/40 opacity-30 cursor-not-allowed'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                      }`}
                    >
                      <span aria-hidden="true">{skin.emoji}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cấu hình phòng (chủ phòng) */}
            {isHost && (
              <div className="mb-5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Settings size={13} aria-hidden="true" /> Cấu hình (chủ phòng)
                </label>
                <div className="flex gap-1.5 mb-2">
                  {(['classic', 'fast', 'chaos'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => updateRoomSettings({ gameMode: m })}
                      className={`flex-1 text-xs font-bold py-1.5 rounded-lg border transition ${
                        settings.gameMode === m
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {m === 'classic' ? 'Cổ điển' : m === 'fast' ? 'Nhanh' : 'Hỗn loạn'}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Toggle
                    label="Free Parking jackpot"
                    checked={settings.houseRules.freeParkingJackpot}
                    onChange={(v) => updateRoomSettings({ houseRules: { ...settings.houseRules, freeParkingJackpot: v } })}
                  />
                  <Toggle
                    label="Double GO (đáp GO ×2)"
                    checked={settings.houseRules.doubleGo}
                    onChange={(v) => updateRoomSettings({ houseRules: { ...settings.houseRules, doubleGo: v } })}
                  />
                  <Toggle
                    label="Đồng hồ lượt (30s)"
                    checked={settings.houseRules.turnTimerSec !== null}
                    onChange={(v) => updateRoomSettings({ houseRules: { ...settings.houseRules, turnTimerSec: v ? 30 : null } })}
                  />
                </div>

                {/* Chủ đề bàn cờ */}
                <div className="mt-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Chủ đề bàn cờ</span>
                  <div className="flex gap-1.5">
                    {BOARD_SKINS.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => updateRoomSettings({ boardSkin: b.id })}
                        aria-label={`Chọn chủ đề bàn cờ ${b.name}`}
                        className={`flex-1 text-xs font-bold py-1.5 rounded-lg border transition ${
                          settings.boardSkin === b.id
                            ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                            : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chủ đề xúc xắc */}
                <div className="mt-2.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Chủ đề xúc xắc</span>
                  <div className="flex gap-1.5">
                    {DICE_SKINS.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => updateRoomSettings({ diceSkin: d.id })}
                        aria-label={`Chọn chủ đề xúc xắc ${d.name}`}
                        className={`flex-1 text-xs font-bold py-1.5 rounded-lg border transition ${
                          settings.diceSkin === d.id
                            ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                            : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            {isHost ? (
              <button
                disabled={players.length < 2}
                onClick={startGame}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold py-4 px-6 rounded-2xl transition-all shadow-xl hover:shadow-cyan-600/10 active:scale-[0.98]"
              >
                <Play size={20} fill="currentColor" />
                Bắt Đầu Trận Đấu
              </button>
            ) : (
              <div className="bg-slate-950/60 border border-slate-850 px-4 py-4 rounded-2xl text-center text-slate-400 text-sm font-medium">
                Đang đợi chủ phòng bắt đầu trận đấu...
              </div>
            )}
            {players.length < 2 && isHost && (
              <p className="text-xs text-amber-500 text-center mt-2 font-medium">
                Cần tối thiểu 2 người chơi để bắt đầu game.
              </p>
            )}
          </div>
        </div>

        {/* Cột phải: Chat trong phòng chờ */}
        <div className="flex flex-col h-[400px] md:h-[450px] bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <MessageSquare size={16} aria-hidden="true" /> Trò chuyện phòng
          </h3>
          
          <div className="flex-1 overflow-y-auto mb-3 space-y-2 pr-1">
            {chats.map((chat, idx) => (
              <div key={idx} className="text-sm leading-relaxed">
                <span
                  className={`font-bold ${
                    chat.sender === 'Hệ thống' ? 'text-amber-500' : 'text-indigo-300'
                  }`}
                >
                  [{chat.timestamp}] {chat.sender}:
                </span>{' '}
                <span className="text-slate-350">{chat.message}</span>
              </div>
            ))}
            {chats.length === 0 && (
              <div className="h-full flex items-center justify-center text-slate-650 text-xs">
                Chưa có tin nhắn nào. Hãy gửi lời chào!
              </div>
            )}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập nội dung trò chuyện..."
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              aria-label="Nhập tin nhắn trò chuyện phòng chờ"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!chatMsg.trim()}
              aria-label="Gửi tin nhắn"
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 p-2.5 rounded-xl text-white transition-colors"
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
