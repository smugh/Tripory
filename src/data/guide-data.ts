import { Ionicons } from '@expo/vector-icons';

export interface GuideTopic {
  id: string;
  category: 'general' | 'trips' | 'packing' | 'agenda' | 'memories' | 'settings';
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  badge: {
    en: string;
    id: string;
  };
  title: {
    en: string;
    id: string;
  };
  subtitle: {
    en: string;
    id: string;
  };
  image: any;
  imageCaption: {
    en: string;
    id: string;
  };
  steps: {
    en: string[];
    id: string[];
  };
  tip: {
    en: string;
    id: string;
  };
  actionRoute?: string;
  actionLabel?: {
    en: string;
    id: string;
  };
  keywords: string[];
}

export const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: 'overview',
    category: 'general',
    icon: 'shield-checkmark',
    iconColor: '#0EA5E9',
    iconBg: '#E0F2FE',
    badge: {
      en: 'Local & Private',
      id: 'Offline & Privat',
    },
    title: {
      en: '1. Local-First Philosophy & Offline Privacy',
      id: '1. Filosofi Local-First & Privasi Tanpa Awan',
    },
    subtitle: {
      en: 'Your journeys and memories are stored 100% on your device with zero cloud tracking.',
      id: 'Semua perjalanan dan kenangan Anda tersimpan 100% di perangkat dengan nol pelacakan cloud.',
    },
    image: require('@/../assets/images/guide/guide-home.png'),
    imageCaption: {
      en: 'Tripory Home: Travel Album, Quick Planning, and Local Database status.',
      id: 'Beranda Tripory: Album Perjalanan, Tombol Rencana Cepat, dan status Database Lokal.',
    },
    steps: {
      en: [
        'Tripory is built local-first: no mandatory online accounts, no server logins, and no cloud tracking.',
        'All itineraries, packing lists, items, and photos are stored inside your device SQLite database (tripory.db).',
        'Works completely offline: plan trips, check suitcases, and write memories in flight mode or off-grid remote areas.',
        'Optional encrypted backup: export your database anytime to your personal Gmail inbox from Settings.',
      ],
      id: [
        'Tripory dibangun dengan prinsip local-first: tanpa akun online wajib, tanpa login server, dan tanpa pelacakan cloud.',
        'Semua rute, daftar packing koper, inventaris barang, dan foto tersimpan di database SQLite lokal perangkat Anda (tripory.db).',
        'Bekerja 100% offline: rencanakan trip, periksa koper, dan catat kenangan di mode pesawat atau puncak gunung tanpa sinyal.',
        'Cadangan privat via Gmail: ekspor database kapan saja ke kotak masuk email pribadi Anda dari menu Pengaturan.',
      ],
    },
    tip: {
      en: 'Since data is stored on-device, your trips load instantly without waiting for cloud downloads or network buffering.',
      id: 'Karena data tersimpan di HP, halaman aplikasi terbuka instan tanpa perlu menunggu loading internet.',
    },
    actionRoute: '/settings/privacy',
    actionLabel: {
      en: 'Check Privacy Settings',
      id: 'Buka Privasi & Data',
    },
    keywords: ['privacy', 'privasi', 'offline', 'local-first', 'cloud', 'sqlite', 'database', 'aman', 'keamanan'],
  },
  {
    id: 'tripPlanning',
    category: 'trips',
    icon: 'map',
    iconColor: '#0284C7',
    iconBg: '#E0F2FE',
    badge: {
      en: 'Multi-Stop Route',
      id: 'Rute Multi-Destinasi',
    },
    title: {
      en: '2. Planning Trips & Destination Roadmaps',
      id: '2. Perencanaan Perjalanan & Roadmap Rute',
    },
    subtitle: {
      en: 'Design custom trips with consecutive stops, planned times, and visit tracking.',
      id: 'Rancang perjalanan dengan titik singgah berurutan, estimasi waktu, dan pelacakan status dikunjungi.',
    },
    image: require('@/../assets/images/guide/guide-trip.png'),
    imageCaption: {
      en: 'Trip Details: Destination Roadmap progression and Co-Pilot Next Step Guide.',
      id: 'Detail Perjalanan: Progres Roadmap Destinasi dan Panduan Co-Pilot Langkah Berikutnya.',
    },
    steps: {
      en: [
        'Tap the center "+" Create button in the bottom navigation and select "Plan a trip".',
        'Choose a 1-tap template (e.g. Weekend Getaway, Mountain Hike, Beach Vacation) or enter custom dates. Backdating is supported for past holidays.',
        'Inside Trip Details, tap "+ Add Stop to Roadmap" to add consecutive destinations (Stop 1, Stop 2, Stop 3) with planned activities and times.',
        'When you arrive at a place, tap "Visited". The Co-Pilot guide updates in real time and prompts you to record any gear used at this stop.',
      ],
      id: [
        'Ketuk tombol "+" Create di navigasi bawah dan pilih "Plan a trip" (Rencanakan perjalanan).',
        'Pilih template cepat 1-ketuk (misal Weekend Getaway, Naik Gunung, Wisata Pantai) atau isi tanggal kustom. Mendukung tanggal lampau (backdate) untuk liburan yang sudah lewat.',
        'Di halaman Detail Trip, ketuk "+ Add Stop to Roadmap" untuk menambah titik singgah berurutan (Stop 1, Stop 2) lengkap dengan jam dan rencana aktivitas.',
        'Saat tiba di lokasi, ketuk "Visited". Panduan Co-Pilot akan beradaptasi secara real-time dan menanyakan barang yang terpakai di titik tersebut.',
      ],
    },
    tip: {
      en: 'Open any destination stop to add location notes, tickets, and dedicated to-do tasks.',
      id: 'Buka detail titik destinasi untuk menambahkan catatan tiket, parkir, dan to-do khusus di lokasi itu.',
    },
    actionRoute: '/trip/new',
    actionLabel: {
      en: 'Create New Trip',
      id: 'Buat Perjalanan Baru',
    },
    keywords: ['trip', 'perjalanan', 'roadmap', 'rute', 'destinasi', 'destination', 'stop', 'visited', 'copilot', 'jadwal'],
  },
  {
    id: 'packingSuitcase',
    category: 'packing',
    icon: 'briefcase',
    iconColor: '#F56B5F',
    iconBg: '#FEE2E2',
    badge: {
      en: 'Visual Suitcase',
      id: 'Koper Cerdas',
    },
    title: {
      en: '3. Smart Packing Lists & Luggage States',
      id: '3. Daftar Packing & Indikator Status Koper',
    },
    subtitle: {
      en: 'Track items from preparation to packed status with visual suitcase indicators and container groups.',
      id: 'Pantau barang dari persiapan hingga siap berangkat dengan visual koper interaktif dan grup wadah.',
    },
    image: require('@/../assets/images/guide/guide-packing.png'),
    imageCaption: {
      en: 'Packing Checklist: Suitcase status indicator, category filters, and container grouping.',
      id: 'Daftar Packing: Indikator status koper, filter kategori, dan wadah kelompok barang.',
    },
    steps: {
      en: [
        'Switch to the "Pack" tab inside your trip workspace to view all items to pack.',
        'Look at the dynamic suitcase banner: Empty (open suitcase), In Progress (partially packed), or Ready (closed suitcase with padlock).',
        'Check items as they go into your bag to switch status from "Need Packing" to "Packed in Luggage".',
        'Group items into Container Packs (e.g. Toiletries Kit, First Aid Pouch) to pack or unpack entire sets with a single tap.',
        'Readiness Blocker: Tripory warns you if important items are still unpacked before heading out.',
      ],
      id: [
        'Masuk ke tab "Pack" di halaman perjalanan untuk melihat seluruh daftar barang bawaan.',
        'Perhatikan ilustrasi koper dinamis: Kosong (terbuka), Sedang Mengemas (terisi sebagian), atau Siap Berangkat (koper tertutup terkunci rapi).',
        'Centang barang saat dimasukkan ke tas untuk mengubah status menjadi "Packed in Luggage".',
        'Gunakan Wadah / Paket Kelompok (misal: Pouch Mandi, Kotak P3K) untuk mengepak semua isinya dalam 1 kali ketuk.',
        'Pengingat Kesiapan: Tripory memberi peringatan jika masih ada perlengkapan yang belum masuk koper sebelum memulai perjalanan.',
      ],
    },
    tip: {
      en: 'Already finished loading your bags? Tap "✓ Mark All Packed" at the top to complete packing in one tap.',
      id: 'Sudah memasukkan semua barang sekaligus? Ketuk "✓ Mark All Packed" di bagian atas untuk verifikasi instan dalam 1 detik.',
    },
    actionRoute: '/(tabs)/inventory',
    actionLabel: {
      en: 'Open Inventory',
      id: 'Buka Inventaris',
    },
    keywords: ['packing', 'koper', 'suitcase', 'pack', 'tas', 'bag', 'barang', 'barang bawaan', 'container', 'group', 'pouch'],
  },
  {
    id: 'itemUsageInTrip',
    category: 'packing',
    icon: 'cube',
    iconColor: '#8B5CF6',
    iconBg: '#F5F3FF',
    badge: {
      en: 'In-Trip Tracking',
      id: 'Pelacakan di Jalan',
    },
    title: {
      en: '4. Luggage Overview & In-Trip Gear Tracking',
      id: '4. Melihat Isi Koper & Penggunaan Barang di Lokasi',
    },
    subtitle: {
      en: 'Know what is currently inside your luggage and manage items taken out or used at stops.',
      id: 'Ketahui isi koper saat ini dan catat peralatan yang dikeluarkan atau digunakan di tempat wisata.',
    },
    image: require('@/../assets/images/guide/guide-packed.png'),
    imageCaption: {
      en: 'Packed Luggage View: Real-time bag contents and quick take-out controls.',
      id: 'Tampilan Isi Koper: Daftar barang di dalam koper dan tombol cepat keluarkan barang.',
    },
    steps: {
      en: [
        'While traveling, select the "Packed" filter chip to inspect everything safely stored inside your luggage.',
        'Need to use something? Tap "Take Out" to temporarily unpack an item or mark it as actively in use.',
        'When marking a destination as "Visited", Tripory opens a dialog where you can mark used items (e.g. trekking poles, camera, rain poncho).',
        'Marking items as used keeps your equipment accounted for and prevents leaving gear behind along the route.',
      ],
      id: [
        'Selama bepergian, ketuk filter "Packed" untuk melihat daftar barang yang saat ini tersimpan di dalam koper/tas.',
        'Perlu memakai barang? Ketuk tombol "Keluarkan" untuk mengembalikan statusnya atau menandainya sedang dipakai.',
        'Saat menandai destinasi "Visited", Tripory otomatis memunculkan dialog untuk mencatat barang yang terpakai di stop tersebut.',
        'Pencatatan ini membuat seluruh perlengkapan terpantau dan mencegah barang tercecer di destinasi.',
      ],
    },
    tip: {
      en: 'You can reassign an item to a different destination stop anytime using "Shift Destination" in the item options menu.',
      id: 'Anda bisa memindahkan rencana pemakaian barang ke stop lain kapan saja lewat menu "Pindahkan Destinasi".',
    },
    actionRoute: '/(tabs)/trips',
    actionLabel: {
      en: 'View Trips',
      id: 'Lihat Perjalanan',
    },
    keywords: ['used', 'terpakai', 'take out', 'keluarkan', 'koper', 'luggage', 'tracking', 'pindahkan', 'destinasi'],
  },
  {
    id: 'agendaShopping',
    category: 'agenda',
    icon: 'cart',
    iconColor: '#10B981',
    iconBg: '#ECFDF5',
    badge: {
      en: 'v1.2.0 New',
      id: 'Fitur Baru v1.2',
    },
    title: {
      en: '5. Agendas & Shopping Price Delta (v1.2.0)',
      id: '5. Agenda & Belanja: Bandingkan Harga Rak vs Struk (v1.2.0)',
    },
    subtitle: {
      en: 'Plan quick activities, groceries, and short trips with real-time price comparison and auto-saved drafts.',
      id: 'Rencanakan belanja, acara, atau trip singkat dengan perbandingan harga rak vs struk belanja.',
    },
    image: require('@/../assets/images/guide/guide-inventory.png'),
    imageCaption: {
      en: 'Agenda & Inventory Workspace: Price calculation, unit amounts, and quick item checklists.',
      id: 'Workspace Agenda & Inventaris: Perhitungan harga, jumlah unit, dan checklist cepat.',
    },
    steps: {
      en: [
        'Tap "+" Create and choose "Plan an agenda" to create a focused list separate from long multi-day trips.',
        'Select from 3 templates: Shopping, Short Trip, or Activity / Event.',
        'Shopping Price Delta: Type the estimated shelf price (Harga Rak) when writing your list. At the cash register, enter the actual receipt price (Harga Struk).',
        'Tripory instantly calculates the total expense and displays the price difference (savings vs surplus).',
        'In-Memory Draft Auto-Save: Even if you navigate away or switch apps, your in-progress agenda is safely retained in memory.',
      ],
      id: [
        'Ketuk "+" Create dan pilih "Plan an agenda" untuk membuat daftar kegiatan praktis tanpa perlu itinerary panjang.',
        'Pilih dari 3 template: Belanja (Shopping), Trip Singkat (Short Trip), atau Kegiatan / Acara (Activity / Event).',
        'Bandingkan Harga Belanja: Masukkan perkiraan harga rak (Estimated Price) saat membuat daftar belanja. Di kasir, masukkan harga asli dari struk (Receipt Price).',
        'Tripory otomatis menghitung total pengeluaran dan menampilkan selisih harga rak vs struk (hemat vs over-budget) seketika.',
        'Draf Aman di Memori: Walau Anda berpindah halaman atau membuka aplikasi lain, draf agenda yang sedang dibuat tidak akan hilang.',
      ],
    },
    tip: {
      en: 'View all active and saved agendas anytime by tapping the "Agendas" button at the top of the Trips tab.',
      id: 'Akses semua agenda aktif dan tersimpan kapan saja dengan mengetuk tombol "Agendas" di bagian atas tab Trips.',
    },
    actionRoute: '/agenda/new',
    actionLabel: {
      en: 'Create Agenda',
      id: 'Buat Agenda Baru',
    },
    keywords: ['agenda', 'belanja', 'shopping', 'harga', 'price', 'struk', 'receipt', 'rak', 'selisih', 'short trip', 'event'],
  },
  {
    id: 'tripCloseReturn',
    category: 'trips',
    icon: 'checkmark-done-circle',
    iconColor: '#16A34A',
    iconBg: '#DCFCE7',
    badge: {
      en: 'Anti-Loss System',
      id: 'Cek Anti-Hilang',
    },
    title: {
      en: '6. Trip Closure & Return Verification Check',
      id: '6. Penutupan Perjalanan & Cek Kepulangan (Anti-Hilang)',
    },
    subtitle: {
      en: 'Reconcile all items before ending the journey, detect missing gear, and archive to memories.',
      id: 'Verifikasi seluruh barang saat pulang, deteksi barang tertinggal, dan arsipkan ke album kenangan.',
    },
    image: require('@/../assets/images/guide/guide-return.png'),
    imageCaption: {
      en: 'Return Checklist: Verify returned items vs missing gear before closing the trip.',
      id: 'Checklist Kepulangan: Verifikasi barang kembali aman vs barang tertinggal sebelum menutup trip.',
    },
    steps: {
      en: [
        'When you arrive back home, open your trip and tap "Finish & Return Check" in the Co-Pilot guide.',
        'The return verification checklist lists every item you brought with you.',
        'Review items one by one: mark each item as "Returned Safely" or "Missing".',
        'This anti-loss check guarantees chargers, sunglasses, passports, and jackets are never forgotten in hotel rooms.',
        'Tap "Complete & Archive Trip" to safely close the journey and preserve all stats and memories in your Home Travel Album.',
      ],
      id: [
        'Saat tiba kembali di rumah, buka perjalanan dan ketuk "Finish & Return Check" di panduan Co-Pilot.',
        'Layar verifikasi kepulangan menampilkan semua perlengkapan yang Anda bawa saat berangkat.',
        'Periksa satu per satu: tandai barang sebagai "Kembali Aman" atau "Hilang / Tertinggal".',
        'Pemeriksaan anti-hilang ini memastikan charger, kacamata, jaket, atau paspor tidak tertinggal di hotel atau tempat wisata.',
        'Ketuk "Complete & Archive Trip" untuk menutup trip dan mengabadikan seluruh statistik dan dokumentasi ke Album Beranda.',
      ],
    },
    tip: {
      en: 'If everything returned safely in one piece, tap "✓ Verify All Items Returned" for instant 1-tap confirmation.',
      id: 'Jika semua barang kembali lengkap tanpa ada yang tertinggal, gunakan tombol "✓ Verify All Items Returned" untuk selesai dalam 1 ketukan.',
    },
    actionRoute: '/(tabs)/trips',
    actionLabel: {
      en: 'View Trips',
      id: 'Lihat Perjalanan',
    },
    keywords: ['return', 'pulang', 'close', 'tutup', 'hilang', 'missing', 'verifikasi', 'selesai', 'arsip', 'archive'],
  },
  {
    id: 'memoriesAlbum',
    category: 'memories',
    icon: 'images',
    iconColor: '#EA580C',
    iconBg: '#FFEDD5',
    badge: {
      en: 'Photo Memories',
      id: 'Dokumentasi Foto',
    },
    title: {
      en: '7. Travel Memories & Home Album Gallery',
      id: '7. Kenangan Perjalanan & Galeri Album Beranda',
    },
    subtitle: {
      en: 'Capture offline photos, geotag road moments, and organize completed journeys into visual albums.',
      id: 'Abadikan foto offline, catat cerita perjalanan, dan tata riwayat liburan dalam album visual.',
    },
    image: require('@/../assets/images/guide/guide-home.png'),
    imageCaption: {
      en: 'Home Travel Album: Filter by Past/Ongoing/Upcoming, toggle Grid/List, and manage privacy.',
      id: 'Album Beranda: Filter Selesai/Aktif/Mendatang, ganti Grid/List, dan kelola privasi album.',
    },
    steps: {
      en: [
        'In any trip workspace, switch to the "Moments" tab to capture photos directly via camera or select from your gallery.',
        'Add travel notes, captions, and impressions to each captured photo.',
        'Completed trips automatically show up in the "Travel Album" gallery on the Home screen.',
        'Use album filters (All, Past, Ongoing, Upcoming) and toggle between Visual Grid and Compact List views.',
        'Album Management (Settings -> Album Management): Hide sensitive trips from the Home feed, edit titles/stories, or delete archived journeys.',
      ],
      id: [
        'Di halaman perjalanan, buka tab "Moments" untuk memotret langsung dengan kamera atau memilih foto terbaik dari galeri.',
        'Tuliskan cerita menarik dan kesan di balik setiap foto kenangan.',
        'Trip yang sudah selesai otomatis tersimpan ke galeri "Travel Album" di layar Beranda.',
        'Gunakan filter album (Semua, Selesai, Sedang Berjalan, Mendatang) dan ganti antara tampilan Kotak Foto (Grid) atau Daftar (List).',
        'Kelola Album (Pengaturan -> Kelola Album): Sembunyikan album tertentu dari beranda, ubah catatan cerita, atau hapus arsip.',
      ],
    },
    tip: {
      en: 'All photo files remain stored locally in your device private storage—no compression or remote cloud uploads.',
      id: 'Semua file foto tersimpan di direktori privat HP Anda tanpa dikompresi atau diunggah ke cloud luar.',
    },
    actionRoute: '/settings/albums',
    actionLabel: {
      en: 'Manage Albums',
      id: 'Kelola Album Kenangan',
    },
    keywords: ['memories', 'kenangan', 'album', 'foto', 'photo', 'moments', 'momen', 'galeri', 'gallery', 'privat', 'hide'],
  },
  {
    id: 'inventoryCategoriesBackup',
    category: 'settings',
    icon: 'settings-sharp',
    iconColor: '#4F46E5',
    iconBg: '#EEF2FF',
    badge: {
      en: 'Settings & Tools',
      id: 'Sistem & Cadangan',
    },
    title: {
      en: '8. Personal Inventory, Categories & Gmail Backup',
      id: '8. Inventaris Pribadi, Kategori & Cadangan Gmail',
    },
    subtitle: {
      en: 'Manage reusable gear, customize category labels, and backup SQLite databases directly to Gmail.',
      id: 'Kelola perlengkapan bawaan, atur kategori kustom, dan cadangkan database SQLite langsung ke Gmail.',
    },
    image: require('@/../assets/images/guide/guide-inventory.png'),
    imageCaption: {
      en: 'Personal Inventory Form: Name, quantity, category, and container grouping.',
      id: 'Formulir Inventaris: Nama barang, jumlah, kategori, dan wadah kelompok.',
    },
    steps: {
      en: [
        'Inventory Tab: Register your personal gear once with photos, quantities, and container groupings to reuse across all future trips.',
        'Category Management (Settings -> Item Categories): Add custom categories matching your hobbies (e.g. Photography, Diving, Camping, Skincare).',
        'Device Permissions (Settings -> Permissions): Inspect native capabilities (Camera, Photos, Location, Gmail, System Clock) used by Tripory.',
        'Gmail Offline Backup (Settings -> Gmail Backup): Enter your Gmail address and tap "Backup Data to Gmail". Tripory dispatches your encrypted local SQLite database directly to your inbox.',
        'Seamless Restore: When changing phones, choose your downloaded tripory-backup.json to restore all trips and items in seconds.',
      ],
      id: [
        'Tab Inventaris: Daftarkan perlengkapan pribadimu sekali saja lengkap dengan foto, jumlah, dan grup wadah untuk dipakai berulang di trip mendatang.',
        'Pengelolaan Kategori (Pengaturan -> Kategori Barang): Tambah kategori kustom sesuai minat (misal: Fotografi, Camping, Skincare, Alat Selam).',
        'Izin Perangkat (Pengaturan -> Izin Akses): Pantau izin kamera, galeri foto, lokasi GPS, email, dan jam sistem.',
        'Cadangan Offline Gmail (Pengaturan -> Cadangan Gmail): Masukkan alamat Gmail lalu ketuk "Backup Data to Gmail". Database SQLite lokal dikirim langsung ke email Anda.',
        'Pemulihan Data: Saat berganti HP, pilih file tripory-backup.json untuk memulihkan seluruh data perjalanan dalam beberapa detik.',
      ],
    },
    tip: {
      en: 'Create reusable container groups in Inventory like "Toiletries Kit" or "Tech Bag" to pack your suitcase faster on every trip.',
      id: 'Buat wadah grup serbaguna di Inventaris seperti "Pouch Mandi" atau "Kabel & Charger" agar persiapan packing trip berikutnya jauh lebih cepat.',
    },
    actionRoute: '/settings/backup',
    actionLabel: {
      en: 'Open Backup Settings',
      id: 'Buka Cadangan Gmail',
    },
    keywords: ['inventory', 'inventaris', 'kategori', 'category', 'backup', 'cadangan', 'restore', 'gmail', 'izin', 'permissions'],
  },
];
