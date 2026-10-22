/**
 * Tripory Travel Presets & Quick Starter Bundles
 * Didesain untuk mempermudah userflow: traveler tidak perlu mengisi formulir dari nol.
 */

export interface PresetDestination {
  name: string;
  activity: string;
  dayNumber: number;
  plannedTime: string;
}

export interface PresetItem {
  name: string;
  category: string;
  priority: 'must_have' | 'conditional' | 'optional';
  quantity: number;
}

export interface TripPreset {
  id: string;
  title: string;
  tagline: string;
  destination: string;
  durationDays: number;
  icon: string;
  badge: string;
  defaultDestinations: PresetDestination[];
  defaultItems: PresetItem[];
}

export const TRIP_PRESETS: TripPreset[] = [
  {
    id: 'weekend-puncak',
    title: 'Liburan Akhir Pekan Puncak',
    tagline: 'Udara sejuk pegunungan & kebun teh',
    destination: 'Puncak, Bogor',
    durationDays: 2,
    icon: 'partly-sunny-outline',
    badge: '2H 1M • Populer',
    defaultDestinations: [
      {
        name: 'Villa & Restoran Puncak Pass',
        activity: 'Check-in, istirahat & santap hangat',
        dayNumber: 1,
        plannedTime: '13:00',
      },
      {
        name: 'Kebun Teh Gunung Mas',
        activity: 'Tea walk pagi & foto pemandangan',
        dayNumber: 2,
        plannedTime: '08:30',
      },
      {
        name: 'Cimory Riverside & Oleh-oleh',
        activity: 'Makan siang & belanja oleh-oleh',
        dayNumber: 2,
        plannedTime: '12:30',
      },
    ],
    defaultItems: [
      { name: 'Jaket Tebal / Windbreaker', category: 'Clothing', priority: 'must_have', quantity: 1 },
      { name: 'Baju Ganti Hangat (2 pasang)', category: 'Clothing', priority: 'must_have', quantity: 2 },
      { name: 'Charger HP & Powerbank', category: 'Electronics', priority: 'must_have', quantity: 1 },
      { name: 'Obat Pribadi & Minyak Kayu Putih', category: 'Medicine', priority: 'must_have', quantity: 1 },
      { name: 'Payung Lipat', category: 'Gear & Activities', priority: 'conditional', quantity: 1 },
    ],
  },
  {
    id: 'explore-jogja',
    title: 'Wisata Budaya & Kuliner Jogja',
    tagline: 'Candi megah, Malioboro, & kuliner legendaris',
    destination: 'Yogyakarta',
    durationDays: 4,
    icon: 'business-outline',
    badge: '4H 3M • Budaya',
    defaultDestinations: [
      {
        name: 'Candi Prambanan Sunset',
        activity: 'Eksplorasi candi & sunset',
        dayNumber: 1,
        plannedTime: '15:30',
      },
      {
        name: 'Jalan Malioboro & Titik Nol',
        activity: 'Jalan santai malam & santap gudeg',
        dayNumber: 2,
        plannedTime: '18:30',
      },
      {
        name: 'Pantai Parangtritis',
        activity: 'Menikmati angin laut sore',
        dayNumber: 3,
        plannedTime: '16:00',
      },
    ],
    defaultItems: [
      { name: 'Baju Santai Nyaman (4 stel)', category: 'Clothing', priority: 'must_have', quantity: 4 },
      { name: 'Sepatu Jalan / Sneakers', category: 'Clothing', priority: 'must_have', quantity: 1 },
      { name: 'Charger & Powerbank 20.000 mAh', category: 'Electronics', priority: 'must_have', quantity: 1 },
      { name: 'Dompet, KTP & Kartu E-Toll', category: 'Documents', priority: 'must_have', quantity: 1 },
      { name: 'Obat Maag & Vitamin Perjalanan', category: 'Medicine', priority: 'must_have', quantity: 1 },
      { name: 'Topi / Kacamata Hitam', category: 'Clothing', priority: 'optional', quantity: 1 },
    ],
  },
  {
    id: 'bali-beach',
    title: 'Pantai & Sunset Bali',
    tagline: 'Pantai eksotis, pura laut, & relaksasi',
    destination: 'Seminyak & Uluwatu, Bali',
    durationDays: 3,
    icon: 'water-outline',
    badge: '3H 2M • Pantai',
    defaultDestinations: [
      {
        name: 'Pantai Kuta & Seminyak',
        activity: 'Menikmati sunset & kelapa muda',
        dayNumber: 1,
        plannedTime: '16:30',
      },
      {
        name: 'Pura Uluwatu & Tari Kecak',
        activity: 'Wisata tebing & nonton tari kecak',
        dayNumber: 2,
        plannedTime: '17:00',
      },
      {
        name: 'Wisata Belanja Krisna Oleh-Oleh',
        activity: 'Beli pie susu & suvenir khas Bali',
        dayNumber: 3,
        plannedTime: '11:00',
      },
    ],
    defaultItems: [
      { name: 'Baju Pantai & Celana Santai', category: 'Clothing', priority: 'must_have', quantity: 3 },
      { name: 'Sunscreen Tabir Surya SPF 50', category: 'Toiletries', priority: 'must_have', quantity: 1 },
      { name: 'Kacamata Hitam Polarized', category: 'Clothing', priority: 'optional', quantity: 1 },
      { name: 'Sandal Nyaman Anti-Slip', category: 'Clothing', priority: 'must_have', quantity: 1 },
      { name: 'Kamera / Tongsis Mini', category: 'Electronics', priority: 'optional', quantity: 1 },
    ],
  },
  {
    id: 'bandung-chill',
    title: 'Road Trip Santai Bandung',
    tagline: 'Wisata alam Lembang & factory outlet',
    destination: 'Bandung & Lembang',
    durationDays: 3,
    icon: 'car-sport-outline',
    badge: '3H 2M • Road Trip',
    defaultDestinations: [
      {
        name: 'Tangkuban Perahu / Kawah Putih',
        activity: 'Menikmati kawah vulkanik & udara dingin',
        dayNumber: 1,
        plannedTime: '10:00',
      },
      {
        name: 'Floating Market Lembang',
        activity: 'Kuliner perahu & taman kelinci',
        dayNumber: 2,
        plannedTime: '13:00',
      },
      {
        name: 'Kawasan Belanja Riau & Dago',
        activity: 'Belanja & santap malam kafe',
        dayNumber: 3,
        plannedTime: '11:00',
      },
    ],
    defaultItems: [
      { name: 'Sweater / Hoodie Nyaman', category: 'Clothing', priority: 'must_have', quantity: 1 },
      { name: 'Kartu E-Toll Saldo Cukup', category: 'Documents', priority: 'must_have', quantity: 1 },
      { name: 'Charger Mobil & Holder HP', category: 'Electronics', priority: 'must_have', quantity: 1 },
      { name: 'Peralatan Mandi Travel Size', category: 'Toiletries', priority: 'must_have', quantity: 1 },
    ],
  },
];

export interface QuickBundle {
  title: string;
  category: string;
  icon: string;
  items: Array<{ name: string; priority: 'must_have' | 'conditional' | 'optional' }>;
}

export const QUICK_PACK_BUNDLES: QuickBundle[] = [
  {
    title: 'Paket Esensial Wajib',
    category: 'Paling Populer',
    icon: 'star',
    items: [
      { name: 'Charger HP & Kabel', priority: 'must_have' },
      { name: 'KTP / SIM / Tanda Pengenal', priority: 'must_have' },
      { name: 'Dompet & Uang Tunai / E-Money', priority: 'must_have' },
      { name: 'Pakaian Ganti Cadangan', priority: 'must_have' },
    ],
  },
  {
    title: 'Paket Pakaian & Mandi',
    category: 'Pakaian',
    icon: 'shirt-outline',
    items: [
      { name: 'Baju Kaos / Kemeja Nyaman (2 pcs)', priority: 'must_have' },
      { name: 'Pakaian Dalam Cadangan (3 pasang)', priority: 'must_have' },
      { name: 'Sikat Gigi & Pasta Gigi Travel', priority: 'must_have' },
      { name: 'Handuk Cepat Kering', priority: 'conditional' },
    ],
  },
  {
    title: 'Paket Gadget & Daya',
    category: 'Elektronik',
    icon: 'battery-charging-outline',
    items: [
      { name: 'Powerbank 10.000 / 20.000 mAh', priority: 'must_have' },
      { name: 'Headphone / TWS Earbuds', priority: 'optional' },
      { name: 'Adaptor Charger Multiport', priority: 'conditional' },
    ],
  },
  {
    title: 'Paket Medis & Perlindungan',
    category: 'Kesehatan',
    icon: 'medkit-outline',
    items: [
      { name: 'Obat Pribadi & Paracetamol', priority: 'must_have' },
      { name: 'Minyak Angin / Aromaterapi', priority: 'must_have' },
      { name: 'Plester Luka & Antiseptik', priority: 'conditional' },
      { name: 'Masker Medis Cadangan', priority: 'optional' },
    ],
  },
];
