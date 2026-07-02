import { Users, Briefcase, MessageSquare } from 'lucide-react';

export type MobilePanel = 'players' | 'portfolio' | 'chat';

export interface MobileNavBarProps {
  active: MobilePanel | null;
  onOpen: (p: MobilePanel) => void;
}

const TABS: { id: MobilePanel; label: string; Icon: typeof Users }[] = [
  { id: 'players', label: 'Người chơi', Icon: Users },
  { id: 'portfolio', label: 'Tài sản', Icon: Briefcase },
  { id: 'chat', label: 'Chat', Icon: MessageSquare },
];

/** Thanh tab dính đáy, chỉ hiện trên mobile (md:hidden). Mở drawer panel tương ứng. */
export function MobileNavBar({ active, onOpen }: MobileNavBarProps) {
  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Điều hướng bảng phụ"
    >
      {TABS.map(({ id, label, Icon }) => {
        const on = active === id;
        return (
          <button
            key={id}
            onClick={() => onOpen(id)}
            aria-label={label}
            aria-pressed={on}
            className={`flex-1 min-h-[52px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
              on ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon size={20} aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
