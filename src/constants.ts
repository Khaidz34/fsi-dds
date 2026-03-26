import { MenuItem, User } from "./types";

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Nguyễn Văn An',
  email: 'an.nv@company.com',
  role: 'employee',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=An',
  debt: 120000,
  paid: 480000,
  walletBalance: 250000
};

export const ADMIN_USER: User = {
  id: 'u2',
  name: 'Sato Kenji',
  email: 'kenji.sato@company.com',
  role: 'admin',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kenji',
  debt: 0,
  paid: 0,
  walletBalance: 1000000
};

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'm1',
    name: {
      vi: 'Thịt viên nấm sốt cà chua',
      en: 'Mushroom Meatballs in Tomato Sauce',
      ja: 'トマトソースのキノコ肉団子'
    },
    description: {
      vi: 'Thịt viên mềm ngọt quyện cùng nấm hương và sốt cà chua đậm đà.',
      en: 'Soft meatballs with shiitake mushrooms in a rich tomato sauce.',
      ja: '濃厚なトマトソースに椎茸を入れた柔らかい肉団子。'
    },
    price: 40000,
    category: 'main',
    image: '',
    available: true,
    tags: ['Traditional'],
    nutrition: { calories: 450, protein: 25, carbs: 20, fat: 18 }
  },
  {
    id: 'm2',
    name: {
      vi: 'Nem hải sản',
      en: 'Seafood Spring Rolls',
      ja: '海鮮春巻き'
    },
    description: {
      vi: 'Nem chiên giòn rụm với nhân hải sản tươi ngon và sốt mayonnaise.',
      en: 'Crispy fried spring rolls with fresh seafood filling and mayonnaise.',
      ja: '新鮮な海鮮の具とマヨネーズが入ったサクサクの揚げ春巻き。'
    },
    price: 40000,
    category: 'main',
    image: '',
    available: true,
    tags: ['Crispy'],
    nutrition: { calories: 380, protein: 15, carbs: 30, fat: 22 }
  },
  {
    id: 'm3',
    name: {
      vi: 'Gà rang muối',
      en: 'Salt-Roasted Chicken',
      ja: '鶏の塩焼き'
    },
    description: {
      vi: 'Gà chiên giòn xóc cùng muối sả thơm nồng, đậm đà vị quê hương.',
      en: 'Crispy fried chicken tossed with aromatic lemongrass salt.',
      ja: '香り高いレモングラスソルトをまぶしたサクサクのフライドチキン。'
    },
    price: 40000,
    category: 'main',
    image: '',
    available: true,
    tags: ['Popular'],
    nutrition: { calories: 520, protein: 35, carbs: 10, fat: 28 }
  },
  {
    id: 'm4',
    name: {
      vi: 'Đậu phụ hấp sốt xì dầu thịt xay',
      en: 'Steamed Tofu with Minced Pork & Soy Sauce',
      ja: 'ひき肉と醤油ソースの蒸し豆腐'
    },
    description: {
      vi: 'Đậu phụ thanh mát hấp cùng thịt xay và sốt xì dầu thơm ngon.',
      en: 'Refreshing steamed tofu with savory minced pork and soy sauce.',
      ja: 'ひき肉と醤油ソースを添えた、さっぱりとした蒸し豆腐。'
    },
    price: 40000,
    category: 'main',
    image: '',
    available: true,
    tags: ['Healthy'],
    nutrition: { calories: 280, protein: 18, carbs: 12, fat: 15 }
  },
  {
    id: 'm5',
    name: {
      vi: 'Cá diêu hồng lọc thịt chiên giòn',
      en: 'Crispy Fried Red Tilapia Fillet',
      ja: 'レッドティラピアのフィレの唐揚げ'
    },
    description: {
      vi: 'Phi lê cá diêu hồng chiên vàng giòn, thịt cá ngọt và thơm.',
      en: 'Golden crispy fried red tilapia fillet, sweet and aromatic fish meat.',
      ja: '黄金色に揚げたサクサクのレッドティラピアのフィレ。'
    },
    price: 40000,
    category: 'main',
    image: '',
    available: true,
    tags: ['Fish'],
    nutrition: { calories: 420, protein: 30, carbs: 15, fat: 20 }
  },
  {
    id: 'm6',
    name: {
      vi: 'Sườn om dưa cải',
      en: 'Braised Ribs with Pickled Mustard Greens',
      ja: '高菜とスペアリブの煮込み'
    },
    description: {
      vi: 'Sườn non mềm ngọt om cùng dưa cải chua thanh, kích thích vị giác.',
      en: 'Tender ribs braised with tangy pickled mustard greens.',
      ja: '酸味のある高菜と一緒に煮込んだ柔らかいスペアリブ。'
    },
    price: 40000,
    category: 'main',
    image: '',
    available: true,
    tags: ['Traditional'],
    nutrition: { calories: 580, protein: 28, carbs: 10, fat: 35 }
  },
  {
    id: 'm7',
    name: {
      vi: 'Bắp giò luộc',
      en: 'Boiled Pork Leg',
      ja: '豚足のボイル'
    },
    description: {
      vi: 'Thịt bắp giò luộc chín tới, thái lát mỏng, giòn sần sật.',
      en: 'Perfectly boiled pork leg, thinly sliced, with a crunchy texture.',
      ja: '完璧に茹でた豚足を薄くスライスした、コリコリとした食感。'
    },
    price: 40000,
    category: 'main',
    image: '',
    available: true,
    tags: ['Simple'],
    nutrition: { calories: 480, protein: 32, carbs: 0, fat: 30 }
  },
  {
    id: 'm8',
    name: {
      vi: 'Ba chỉ rang cháy cạnh',
      en: 'Caramelized Pork Belly',
      ja: '豚バラ肉のカリカリ炒め'
    },
    description: {
      vi: 'Thịt ba chỉ rang cháy cạnh thơm lừng, đậm đà vị mặn ngọt.',
      en: 'Fragrant caramelized pork belly with a perfect balance of salty and sweet.',
      ja: '塩味と甘味のバランスが絶妙な、香り高い豚バラ肉のキャラメリゼ。'
    },
    price: 40000,
    category: 'main',
    image: '',
    available: true,
    tags: ['Classic'],
    nutrition: { calories: 620, protein: 22, carbs: 5, fat: 55 }
  }
];
