export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'm1',
    name: 'Kopi Susu Gula Aren',
    category: 'Coffee',
    price: 28000,
    description: 'Espresso dengan susu segar gurih dan kemanisan gula aren organik.',
    imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'm2',
    name: 'Kyoto Matcha Latte',
    category: 'Matcha',
    price: 38000,
    description: 'Ceremonial Japanese matcha asli berpadu lembut dengan oat milk premium.',
    imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'm3',
    name: 'Almond Butter Croissant',
    category: 'Bakery',
    price: 35000,
    description: 'Pastry mentega berlapis ganda, dipanggang dengan taburan almond renyah.',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'm4',
    name: 'Premium Truffle Fries',
    category: 'Snacks',
    price: 42000,
    description: 'Kentang potongan lurus berbalut minyak truffle hitam wangi dan taburan parmesan.',
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'm5',
    name: 'Bento Beef Gyudon',
    category: 'Mains',
    price: 58000,
    description: 'Irisan daging sapi tipis gurih dengan kuah khas Jepang di atas nasi hangat.',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'm6',
    name: 'Salmon Mentai Rice',
    category: 'Mains',
    price: 65000,
    description: 'Salmon panggang lembut dengan balutan saus mentai gurih berempah di atas nasi hangat.',
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80',
  }
];
