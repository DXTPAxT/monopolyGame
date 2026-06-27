import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import type { Player } from './types/game';
import { GameLobby } from './components/GameLobby';
import { Board } from './components/Board';
import { PlayerList } from './components/PlayerList';
import { PortfolioPanel } from './components/hud/PortfolioPanel';
import { WinnerModal } from './components/modals/WinnerModal';
import { ChatPanel } from './components/ChatPanel';
import { AlertCircle, X, LogOut, Volume2, VolumeX } from 'lucide-react';
import { isSoundMuted, setSoundMuted } from './utils/sound';
import { HelpButton } from './components/HelpButton';
import { getBoardTheme } from './data/boardThemes';

export default function App() {
  const {
    connected,
    playerId,
    roomCode,
    players,
    hostId,
    gameStarted,
    gameState,
    chats,
    errorMsg,
    createRoom,
    joinRoom,
    startGame,
    rollDice,
    buyProperty,
    buildHouse,
    endTurn,
    confirmLanding,
    declareBankruptcy,
    sendChat,
    restartGame,
    clearError,
    sellHouse,
    mortgageTile,
    unmortgageTile,
    sellDeed,
    roomSettings,
    selectSkin,
    updateRoomSettings,
    declineBuy,
    finishBuild,
    jailAction,
    settleFunds,
  } = useSocket();

  const isMyTurn = !!gameState && gameState.players[gameState.activePlayerIndex]?.id === playerId;
  const [muted, setMuted] = useState(isSoundMuted());
  const toggleMute = () => { const v = !muted; setSoundMuted(v); setMuted(v); };
  const boardThemeBg = getBoardTheme(gameState?.settings?.boardSkin).appBg;

  const [isAnimDone, setIsAnimDone] = useState(true);
  const [visualPlayers, setVisualPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!gameState) {
      setVisualPlayers([]);
      return;
    }

    const isLandingModalActive = gameState.activeModal && ['pay_rent', 'pay_tax', 'chance', 'community_chest'].includes(gameState.activeModal);
    const shouldUpdateMoney = isAnimDone && !isLandingModalActive;

    setVisualPlayers((prev) => {
      return gameState.players.map((p) => {
        const prevPlayer = prev.find((pr) => pr.id === p.id);
        if (prevPlayer && !shouldUpdateMoney) {
          return {
            ...p,
            money: prevPlayer.money,
          };
        }
        return p;
      });
    });
  }, [gameState, isAnimDone]);

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden relative select-none">
      
      {/* Toast thông báo lỗi */}
      {errorMsg && (
        <div role="alert" className="fixed top-6 right-6 z-50 max-w-sm bg-red-950/90 border border-red-500/30 text-red-200 px-4 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-bounce-slow backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-400 shrink-0" aria-hidden="true" />
            <span className="text-xs font-semibold">{errorMsg}</span>
          </div>
          <button
            onClick={clearError}
            aria-label="Đóng thông báo lỗi"
            className="text-red-400 hover:text-red-200 transition-colors p-1"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Màn hình Chờ (Lobby) hoặc Trận đấu */}
      {!gameStarted || !gameState ? (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <GameLobby
            roomCode={roomCode}
            players={players}
            playerId={playerId}
            hostId={hostId}
            chats={chats}
            connected={connected}
            createRoom={createRoom}
            joinRoom={joinRoom}
            startGame={startGame}
            sendChat={sendChat}
            roomSettings={roomSettings}
            selectSkin={selectSkin}
            updateRoomSettings={updateRoomSettings}
          />
          {/* Footer bản quyền chỉ hiển thị ở màn hình chờ */}
          <footer className="text-center py-4 text-[10px] text-slate-500 font-semibold uppercase tracking-widest mt-auto border-t border-slate-950/30 shrink-0">
            Monopoly Multiplayer Web Game MVP &copy; 2026
          </footer>
        </div>
      ) : (
        /* Màn hình Trận đấu chính (Gameplay) */
        <div className="flex-1 flex flex-col overflow-hidden h-full">
          {/* Header Bar */}
          <header className="h-14 border-b border-slate-900 flex items-center justify-between px-6 shrink-0 bg-slate-950/80 backdrop-blur-md z-50">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 uppercase">
                Cờ Tỷ Phú 3D
              </h1>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              <HelpButton />
              <button
                onClick={toggleMute}
                title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              >
                {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
              </button>
              <span>Phòng: <span className="text-cyan-400 font-extrabold">{roomCode}</span></span>
            </div>
          </header>

          {/* Màn hình chiến thắng */}
          {gameState.winnerId && (
            <WinnerModal gameState={gameState} isHost={playerId === hostId} restartGame={restartGame} />
          )}

          {/* Layout chính - Tận dụng toàn bộ màn hình */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-4 items-stretch justify-center w-full h-full max-w-none">
            
            {/* Cột trái: Bàn cờ 11x11 với hiệu ứng Spotlight sòng bài - Chiếm phần lớn diện tích (75-80%) */}
            <div className={`flex-grow md:flex-1 flex flex-col items-center justify-center p-2 bg-slate-950 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${boardThemeBg} border border-slate-900 rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.05)] overflow-hidden relative`}>
              <Board
                gameState={gameState}
                playerId={playerId}
                hostId={hostId}
                rollDice={rollDice}
                buyProperty={buyProperty}
                buildHouse={buildHouse}
                endTurn={endTurn}
                confirmLanding={confirmLanding}
                declareBankruptcy={declareBankruptcy}
                restartGame={restartGame}
                declineBuy={declineBuy}
                jailAction={jailAction}
                settleFunds={settleFunds}
                finishBuild={finishBuild}
                onAnimationStatusChange={setIsAnimDone}
              />
            </div>

            {/* Cột phải: Panel quản lý trạng thái, chat & logs - Khóa rộng 260px để bàn cờ luôn là tâm điểm */}
            <div className="w-full md:w-[260px] flex flex-col gap-4 overflow-hidden h-full shrink-0">
              
              {/* Sidebar danh sách người chơi Glassmorphism */}
              <div className="flex-[4] bg-slate-900/20 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3.5 overflow-hidden flex flex-col shadow-2xl">
                 <PlayerList
                  players={visualPlayers.length > 0 ? visualPlayers : gameState.players}
                  activePlayerIndex={gameState.activePlayerIndex}
                  tiles={gameState.tiles}
                  playerId={playerId}
                />
              </div>

              {/* Panel "Tài sản của tôi" — quản lý xây/bán/cầm cố */}
              <div className="shrink-0 overflow-y-auto">
                <PortfolioPanel
                  gameState={gameState}
                  playerId={playerId}
                  isMyTurn={isMyTurn}
                  buildHouse={buildHouse}
                  sellHouse={sellHouse}
                  mortgageTile={mortgageTile}
                  unmortgageTile={unmortgageTile}
                  sellDeed={sellDeed}
                  visualMoney={visualPlayers.find((p) => p.id === playerId)?.money}
                />
              </div>


              {/* Panel Chat (Trò chuyện) - Xếp chồng, collapsible, co giãn tự động */}
              <div className="flex-[4.5] overflow-hidden flex flex-col">
                <ChatPanel chats={chats} sendChat={sendChat} />
              </div>

              {/* Nút thoát game */}
              <button
                onClick={() => {
                  try { localStorage.removeItem('ctp_token'); localStorage.removeItem('ctp_room'); } catch { /* ignore */ }
                  window.location.reload();
                }}
                className="w-full py-2.5 shrink-0 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-500 hover:text-slate-350 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <LogOut size={12} aria-hidden="true" /> Thoát ra Sảnh
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
