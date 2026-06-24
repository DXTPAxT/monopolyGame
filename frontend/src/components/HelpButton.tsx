import { useState, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

export function HelpButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Hướng dẫn chơi"
        aria-label="Mở hướng dẫn chơi"
        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-300 transition"
      >
        <HelpCircle size={16} aria-hidden="true" />
      </button>

      {open && (
        // full-screen dim overlay, click backdrop to close; centered scrollable panel
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 pt-24" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-modal-title"
            className="w-full max-w-lg max-h-[72vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header with title "Hướng dẫn chơi Cờ Tỷ Phú" + close (X) button calling setOpen(false) */}
            <div className="flex items-center justify-between mb-5">
              <h2 id="help-modal-title" className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
                Hướng dẫn chơi Cờ Tỷ Phú
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Đóng hướng dẫn"
                className="text-slate-400 hover:text-slate-200 transition p-1"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* then the guide content as sections */}
            <div className="space-y-4 text-slate-300 text-xs leading-relaxed">

              {/* Mục tiêu */}
              <section>
                <h3 className="font-bold text-indigo-300 mb-2">Mục tiêu</h3>
                <p>Là người chơi cuối cùng chưa phá sản (hoặc giàu nhất khi hết giờ).</p>
              </section>

              {/* Lượt chơi */}
              <section>
                <h3 className="font-bold text-indigo-300 mb-2">Lượt chơi</h3>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Đổ 2 xúc xắc, đi theo số điểm.</li>
                  <li>Đổ đôi được đi thêm lượt.</li>
                  <li>Đổ đôi 3 lần liên tiếp thì vào tù.</li>
                </ul>
              </section>

              {/* Mua đất */}
              <section>
                <h3 className="font-bold text-indigo-300 mb-2">Mua đất</h3>
                <p>Dừng ở ô đất trống → mua hoặc bỏ qua (bỏ qua thì đem ra đấu giá).</p>
              </section>

              {/* Tiền thuê */}
              <section>
                <h3 className="font-bold text-indigo-300 mb-2">Tiền thuê</h3>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Dừng ở đất người khác phải trả tiền thuê.</li>
                  <li>Sở hữu trọn nhóm màu thì thuê gấp đôi và được xây nhà.</li>
                </ul>
              </section>

              {/* Xây dựng */}
              <section>
                <h3 className="font-bold text-indigo-300 mb-2">Xây dựng</h3>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Sở hữu trọn nhóm màu → xây 1→4 nhà rồi lên Khách Sạn.</li>
                  <li>Phải xây đều giữa các ô trong cùng nhóm màu.</li>
                  <li>Xây/bán/cầm cố ở panel "Tài sản của tôi".</li>
                </ul>
              </section>

              {/* Cầm cố */}
              <section>
                <h3 className="font-bold text-indigo-300 mb-2">Cầm cố</h3>
                <p>Thiếu tiền có thể cầm cố đất (nhận 50% giá), chuộc lại trả thêm 10%.</p>
              </section>

              {/* Đấu giá / Giao dịch */}
              <section>
                <h3 className="font-bold text-indigo-300 mb-2">Đấu giá & Giao dịch</h3>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Từ chối mua → đấu giá với tất cả người chơi.</li>
                  <li>Bấm "Giao dịch" để trao đổi đất/tiền/thẻ với người khác.</li>
                </ul>
              </section>

              {/* Nhà tù */}
              <section>
                <h3 className="font-bold text-indigo-300 mb-2">Nhà tù</h3>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Ra tù bằng cách trả $50.</li>
                  <li>Dùng thẻ "Ra Tù Miễn Phí".</li>
                  <li>Hoặc đổ xúc xắc đôi.</li>
                </ul>
              </section>

              {/* Thẻ Cơ Hội / Quỹ Cộng Đồng */}
              <section>
                <h3 className="font-bold text-indigo-300 mb-2">Cơ Hội & Quỹ Cộng Đồng</h3>
                <p>Rút thẻ và làm theo hướng dẫn.</p>
              </section>

              {/* Đi qua ô GO */}
              <section>
                <h3 className="font-bold text-indigo-300 mb-2">Ô Bắt Đầu (GO)</h3>
                <p>Đi qua ô Bắt Đầu nhận $200 (bao gồm khi kết thúc lượt ở đó).</p>
              </section>

              {/* Phá sản */}
              <section>
                <h3 className="font-bold text-indigo-300 mb-2">Phá sản</h3>
                <p>Không đủ tiền trả nợ kể cả sau khi bán/cầm cố → phá sản, tài sản chuyển cho chủ nợ.</p>
              </section>

              {/* Mẹo */}
              <section>
                <h3 className="font-bold text-emerald-400 mb-2"><span aria-hidden="true">💡</span> Mẹo chiến lược</h3>
                <p>Ưu tiên gom trọn 1 nhóm màu để xây nhà — đó là nguồn thu lớn nhất!</p>
              </section>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
