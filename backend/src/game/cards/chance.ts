import { Card } from '../types';

export const CHANCE_CARDS: Card[] = [
  {
    id: 'chance_01',
    text: 'Trúng vé số! Nhận $50 từ ngân hàng.',
    effect: { kind: 'money', amount: 50 }
  },
  {
    id: 'chance_02',
    text: 'Kẹt xe trên Lê Lợi. Lùi lại 3 ô.',
    effect: { kind: 'moveBy', amount: -3 }
  },
  {
    id: 'chance_03',
    text: 'Đi du lịch Vịnh Hạ Long. Tiến thẳng tới Vịnh Hạ Long.',
    effect: { kind: 'moveTo', target: 24, grantGo: true }
  },
  {
    id: 'chance_04',
    text: 'Vi phạm giao thông. Đóng phạt $15.',
    effect: { kind: 'money', amount: -15 }
  },
  {
    id: 'chance_05',
    text: 'Ra tù miễn phí. Giữ thẻ này.',
    effect: { kind: 'getOutOfJail' }
  },
  {
    id: 'chance_06',
    text: 'Tiến thẳng tới GO. Nhận $200.',
    effect: { kind: 'advanceToGo' }
  },
  {
    id: 'chance_07',
    text: 'Mua vé xổ số và thua. Đóng $25 cho mỗi người chơi.',
    effect: { kind: 'moneyPerPlayer', amount: -25 }
  },
  {
    id: 'chance_08',
    text: 'Bão lụt! Cần sửa nhà cửa. Trả $25 mỗi nhà, $100 mỗi khách sạn.',
    effect: { kind: 'repairs', amount: 25, perHotel: 100 }
  },
  {
    id: 'chance_09',
    text: 'Vào tù! Đi tù ngay lập tức.',
    effect: { kind: 'goToJail' }
  },
  {
    id: 'chance_10',
    text: 'Tiến tới nhà ga gần nhất.',
    effect: { kind: 'nearest', nearest: 'railroad' }
  },
  {
    id: 'chance_11',
    text: 'Thưởng nóng $100 từ công ty.',
    effect: { kind: 'money', amount: 100 }
  },
  {
    id: 'chance_12',
    text: 'Tiến tới công ty viện ích gần nhất.',
    effect: { kind: 'nearest', nearest: 'utility' }
  },
  {
    id: 'chance_13',
    text: 'Nhận tiền thương cho bộ sưu tập. +$75',
    effect: { kind: 'money', amount: 75 }
  },
  {
    id: 'chance_14',
    text: 'Đi tuyên truyền quốc phòng. Tiến 5 ô.',
    effect: { kind: 'moveBy', amount: 5 }
  },
  {
    id: 'chance_15',
    text: 'Lễ hội Tết! Mỗi người chơi tặng bạn $50.',
    effect: { kind: 'moneyPerPlayer', amount: 50 }
  },
  {
    id: 'chance_16',
    text: 'Trực thăng tới Dinh Độc Lập.',
    effect: { kind: 'moveTo', target: 39, grantGo: false }
  }
];
