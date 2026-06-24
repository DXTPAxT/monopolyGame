import { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronDown, ChevronUp, Coins, HelpCircle, Gift, ShieldAlert, Dice5, Lock, Skull, Sparkles, ArrowRight, User } from 'lucide-react';

interface GameLogsProps {
  logs: string[];
}

export function GameLogs({ logs }: GameLogsProps) {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, expanded]);

  // Lấy dòng log mới nhất để hiển thị khi thu gọn
  const latestLog = logs.length > 0 ? logs[logs.length - 1] : 'Chưa có hoạt động nào.';

  // Phân loại sự kiện log để trả về Icon và Styling tương ứng
  const getLogEventStyle = (log: string) => {
    if (log.includes('[PHÁ SẢN]')) {
      return {
        icon: <Skull size={10} className="text-red-400 shrink-0" />,
        className: 'border-red-950/45 bg-red-950/20 text-red-300 font-extrabold',
      };
    }
    if (log.includes('[KẾT THÚC GAME]')) {
      return {
        icon: <Sparkles size={10} className="text-emerald-400 shrink-0 animate-pulse" />,
        className: 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300 font-black uppercase tracking-wider',
      };
    }
    if (log.includes('đã mua') || log.includes('xây nhà')) {
      return {
        icon: <Coins size={10} className="text-emerald-400 shrink-0" />,
        className: 'border-emerald-950/40 bg-emerald-950/5 text-emerald-400/90 font-bold',
      };
    }
    if (log.includes('tiền thuê') || log.includes('đã trả')) {
      return {
        icon: <ArrowRight size={10} className="text-rose-450 shrink-0" />,
        className: 'border-rose-950/40 bg-rose-950/5 text-rose-400/90',
      };
    }
    if (log.includes('đã đổ được') || log.includes('Đổ đôi')) {
      return {
        icon: <Dice5 size={10} className="text-cyan-400 shrink-0" />,
        className: 'border-cyan-950/40 bg-cyan-950/5 text-cyan-300/90',
      };
    }
    if (log.includes('[Cơ Hội]') || log.includes('[Quỹ Cộng Đồng]') || log.includes('rút thẻ')) {
      const isChance = log.includes('[Cơ Hội]');
      return {
        icon: isChance ? <HelpCircle size={10} className="text-amber-400 shrink-0" /> : <Gift size={10} className="text-emerald-400 shrink-0" />,
        className: isChance 
          ? 'border-amber-950/40 bg-amber-950/5 text-amber-300/90 font-medium'
          : 'border-emerald-950/40 bg-emerald-950/5 text-emerald-400/90 font-medium',
      };
    }
    if (log.includes('thuế') || log.includes('thanh toán thuế')) {
      return {
        icon: <ShieldAlert size={10} className="text-orange-400 shrink-0" />,
        className: 'border-orange-950/40 bg-orange-950/5 text-orange-400/90',
      };
    }
    if (log.includes('Nhà Tù') || log.includes('vào tù')) {
      return {
        icon: <Lock size={10} className="text-slate-400 shrink-0" />,
        className: 'border-slate-800/50 bg-slate-900/10 text-slate-400',
      };
    }
    if (log.includes('chuyển sang')) {
      return {
        icon: <User size={10} className="text-slate-650 shrink-0" />,
        className: 'border-slate-950/50 bg-slate-950/5 text-slate-500 italic',
      };
    }
    return {
      icon: <span className="text-slate-600 shrink-0">&gt;</span>,
      className: 'border-slate-900/60 bg-slate-950/10 text-slate-400',
    };
  };

  return (
    <div className={`flex flex-col bg-slate-950 border border-slate-900/60 rounded-xl overflow-hidden transition-all duration-300 shadow-inner ${
      expanded ? 'h-[185px]' : 'h-[52px]'
    }`}>
      {/* Header clickable để mở rộng/thu gọn */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-1.5 px-3 bg-slate-900/40 border-b border-slate-900/40 hover:bg-slate-900/85 transition-colors flex items-center justify-between shrink-0 select-none"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
          <Terminal size={12} className="text-cyan-500/70" /> Nhật ký trận đấu
        </span>
        <div className="flex items-center gap-1.5 max-w-[170px] truncate">
          {!expanded && (
            <span className="text-[8.5px] text-slate-500 font-mono italic truncate">
              {latestLog}
            </span>
          )}
          {expanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronUp size={12} className="text-slate-500" />}
        </div>
      </button>

      {/* Nội dung nhật ký */}
      {expanded ? (
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 pr-1.5 font-sans">
          {logs.map((log, idx) => {
            const style = getLogEventStyle(log);
            return (
              <div
                key={idx}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9.5px] leading-normal shadow-sm transition-all hover:scale-[1.005] ${style.className}`}
              >
                {style.icon}
                <span className="truncate">{log}</span>
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>
      ) : (
        /* Dòng log duy nhất khi thu gọn */
        <div className="px-2.5 py-1.5 font-sans truncate select-none leading-none flex items-center h-full w-full">
          {logs.length > 0 ? (
            (() => {
              const style = getLogEventStyle(latestLog);
              return (
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] w-full ${style.className} truncate`}>
                  {style.icon}
                  <span className="truncate">{latestLog}</span>
                </div>
              );
            })()
          ) : (
            <span className="text-slate-600 text-[9.5px] italic">Chưa có hoạt động nào.</span>
          )}
        </div>
      )}
    </div>
  );
}
