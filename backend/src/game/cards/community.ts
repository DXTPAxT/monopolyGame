import { Card } from '../types';

export const COMMUNITY_CARDS: Card[] = [
  {
    id: 'community_01',
    text: 'Lì xì Tết! Nhận $100 từ ngân hàng.',
    effect: { kind: 'money', amount: 100 }
  },
  {
    id: 'community_02',
    text: 'Viện phí bảo hiểm y tế. Trả $50.',
    effect: { kind: 'money', amount: -50 }
  },
  {
    id: 'community_03',
    text: 'Ra tù miễn phí. Giữ thẻ này.',
    effect: { kind: 'getOutOfJail' }
  },
  {
    id: 'community_04',
    text: 'Tiến thẳng tới GO.',
    effect: { kind: 'advanceToGo' }
  },
  {
    id: 'community_05',
    text: 'Doanh số kinh doanh tốt. Nhận $200.',
    effect: { kind: 'money', amount: 200 }
  },
  {
    id: 'community_06',
    text: 'Đóng thuế thu nhập. -$100.',
    effect: { kind: 'money', amount: -100 }
  },
  {
    id: 'community_07',
    text: 'Lũ lụt phải sửa nhà. Trả $40 mỗi nhà, $115 mỗi khách sạn.',
    effect: { kind: 'repairs', amount: 40, perHotel: 115 }
  },
  {
    id: 'community_08',
    text: 'Dự án xã hội: mỗi người chơi đóng góp $25.',
    effect: { kind: 'moneyPerPlayer', amount: -25 }
  },
  {
    id: 'community_09',
    text: 'Vào tù! Lao động công ích.',
    effect: { kind: 'goToJail' }
  },
  {
    id: 'community_10',
    text: 'Mưa bão! Phải cải tạo nhà. Trả $50 mỗi nhà, $150 mỗi khách sạn.',
    effect: { kind: 'repairs', amount: 50, perHotel: 150 }
  },
  {
    id: 'community_11',
    text: 'Tiếp sức bóng đá. Mỗi người chơi tặng bạn $40.',
    effect: { kind: 'moneyPerPlayer', amount: 40 }
  },
  {
    id: 'community_12',
    text: 'Thực hiện hợp đồng. Nhận $25.',
    effect: { kind: 'money', amount: 25 }
  },
  {
    id: 'community_13',
    text: 'Du lịch nước ngoài. Đi ngay tới Nhà ga Sài Gòn.',
    effect: { kind: 'moveTo', target: 5, grantGo: false }
  },
  {
    id: 'community_14',
    text: 'Bán máu hiến tạng. Nhận $50.',
    effect: { kind: 'money', amount: 50 }
  },
  {
    id: 'community_15',
    text: 'Trồng cây xanh thành phố. Mỗi người chơi cảm ơn bạn $35.',
    effect: { kind: 'moneyPerPlayer', amount: 35 }
  },
  {
    id: 'community_16',
    text: 'Thay đổi địa chỉ liên lạc. Đi tới Nhà tù.',
    effect: { kind: 'moveTo', target: 10, grantGo: false }
  }
];
