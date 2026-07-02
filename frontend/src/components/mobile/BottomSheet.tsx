import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** 'auto' = cao theo nội dung; 'tall' = ~75% màn hình. */
  heightMode?: 'auto' | 'tall';
  children: React.ReactNode;
}

/**
 * Tấm trượt từ đáy màn hình (mobile). Backdrop bấm-ngoài-để-đóng, phím Escape,
 * kéo grabber xuống để đóng, khoá cuộn nền, tôn trọng safe-area (tai thỏ).
 */
export function BottomSheet({ open, onClose, title, heightMode = 'auto', children }: BottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  // Đóng bằng phím Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Khoá cuộn nền khi mở.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Reset vị trí kéo mỗi lần mở lại.
  useEffect(() => { if (open) setDragY(0); }, [open]);

  if (!open) return null;

  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragY > 100) onClose();
    else setDragY(0);
    startY.current = null;
  };

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label={title || 'Bảng'}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Tấm sheet */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-slate-900 border-t border-slate-700 rounded-t-3xl shadow-2xl flex flex-col ${
          heightMode === 'tall' ? 'h-[75vh]' : 'max-h-[75vh]'
        }`}
        style={{ transform: `translateY(${dragY}px)`, transition: startY.current === null ? 'transform 0.25s ease' : 'none', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Grabber + header (vùng kéo) */}
        <div
          className="shrink-0 pt-2.5 pb-2 px-4 flex flex-col items-center gap-2 cursor-grab select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <span className="w-10 h-1.5 rounded-full bg-slate-600" aria-hidden="true" />
          <div className="w-full flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="p-2 -mr-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        {/* Nội dung cuộn được */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}
