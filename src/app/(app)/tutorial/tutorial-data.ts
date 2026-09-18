export interface UserNeedGuide {
  id: string;
  icon: string;
  userGoal: string;
  problemSolved: string;
  recommendedFeature: string;
  route: string;
  color: string;
  howToSteps: string[];
  whyThisFeature: string;
  connectedTo: string;
}

export interface FeatureGuideItem {
  id: string;
  menuName: string;
  badge: string;
  icon: string;
  route: string;
  simpleExplanation: string;
  whatYouCanDo: string[];
  stepByStep: string[];
  tips: string;
}

export interface DailyWorkflowPhase {
  time: string;
  phaseName: string;
  icon: string;
  whatYouFeel: string;
  whatYouShouldDo: string;
  menuToOpen: string;
  route: string;
  explanation: string;
}

export interface FeatureConnectionExplainer {
  id: string;
  title: string;
  icon: string;
  analogy: string;
  step1: { name: string; action: string };
  step2: { name: string; action: string };
  howTheyHelpYou: string;
  practicalExample: string;
}

// ==============================================================================
// 1. PANDUAN BERDASARKAN KEBUTUHAN ANDA ("SAYA INGIN...")
// ==============================================================================
export const USER_NEEDS_GUIDES: UserNeedGuide[] = [
  {
    id: "need-life-plan",
    icon: "🧭",
    userGoal: "Saya ingin menata arah dan tujuan hidup agar tidak merasa jalan di tempat",
    problemSolved: "Sering merasa hari-hari terlewat begitu saja tanpa hasil nyata, bingung apa yang sebenarnya ingin dicapai, atau merasa prioritas hidup berantakan.",
    recommendedFeature: "Target & Proyek",
    route: "/goals",
    color: "from-violet-500/20 to-purple-500/10 border-violet-500/30 text-violet-300",
    whyThisFeature: "Di halaman Target & Proyek terdapat 3 bagian: Target (Goals) untuk impian jangka panjang, Proyek untuk rencana ber-deadline, dan Pilar Hidup untuk menjaga keseimbangan antar aspek kehidupan. Semuanya terhubung dalam satu tempat.",
    howToSteps: [
      "Buka menu 'Target & Proyek' (/goals).",
      "Klik tab 'Pilar Hidup (Areas)' untuk menentukan aspek hidup utama Anda — misalnya: Kesehatan, Karier, Keuangan, Keluarga.",
      "Kembali ke tab 'Target (Goals)', buat impian besar yang ingin dicapai dalam 3–12 bulan. Kaitkan ke pilar yang sesuai.",
      "Bagi target besar menjadi beberapa tahapan (Stages) agar tidak terasa berat dan mudah dicicil.",
    ],
    connectedTo: "Setiap tahapan target akan menghasilkan tugas harian di menu 'Hari Ini'. Saat tugas selesai, progres target Anda bertambah otomatis!",
  },
  {
    id: "need-manage-projects",
    icon: "📦",
    userGoal: "Saya punya proyek penting yang harus selesai sebelum batas waktu tertentu",
    problemSolved: "Punya rencana atau tugas besar tapi sering tertunda, lupa tenggat waktu, atau bingung membagi langkah-langkah pengerjaannya.",
    recommendedFeature: "Target & Proyek — tab Proyek",
    route: "/goals?tab=projects",
    color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-300",
    whyThisFeature: "Tab 'Proyek' di dalam halaman Target & Proyek dibuat untuk pekerjaan yang punya batas waktu (deadline) jelas dan hasil akhir konkret — contoh: Renovasi Rumah, Menulis Buku, Merilis Toko Online.",
    howToSteps: [
      "Buka 'Target & Proyek' (/goals), lalu klik tab 'Proyek (Projects)'.",
      "Klik 'Tambah Proyek Baru', beri nama dan tentukan tanggal batas waktu (deadline).",
      "Buat Tonggak Capaian (Milestone) sebagai rambu perjalanan proyek.",
      "Tambahkan tugas-tugas nyata yang perlu dikerjakan untuk setiap tonggak.",
    ],
    connectedTo: "Tugas di dalam proyek akan otomatis muncul di menu 'Hari Ini' saat tanggal batas waktu mulai mendekat.",
  },
  {
    id: "need-daily-tasks",
    icon: "✅",
    userGoal: "Saya ingin mengatur dan menyelesaikan tugas-tugas harian tanpa rasa panik",
    problemSolved: "Melihat daftar tugas menumpuk dan merasa kewalahan, tidak tahu harus mulai dari mana, atau sering menunda sampai malam hari.",
    recommendedFeature: "Hari Ini & Mode Fokus",
    route: "/today",
    color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300",
    whyThisFeature: "'Hari Ini' adalah meja kerja harian Anda. Semua tugas hari ini tersusun rapi di sini. 'Mode Fokus' adalah ruang kerja tenang dengan timer Pomodoro untuk mengerjakan satu tugas sampai tuntas.",
    howToSteps: [
      "Buka 'Hari Ini' (/today) setiap pagi untuk melihat apa yang perlu diselesaikan.",
      "Pilih 3 tugas paling penting yang ingin Anda prioritaskan hari ini.",
      "Klik 'Mulai Fokus' pada salah satu tugas untuk masuk ke Mode Fokus dengan timer 25 menit.",
      "Centang tugas saat selesai untuk merayakan kemajuan kecil Anda.",
    ],
    connectedTo: "Setiap tugas yang diselesaikan akan menambah catatan jam kerja dan memperbarui grafik kemajuan di 'Progress & Refleksi'.",
  },
  {
    id: "need-quick-capture",
    icon: "💡",
    userGoal: "Tiba-tiba terpikir ide cemerlang atau teringat tugas mendadak saat sedang sibuk",
    problemSolved: "Ide bagus sering terlupakan karena tidak langsung dicatat, atau pekerjaan utama terganggu karena langsung mengerjakan hal baru yang tiba-tiba melintas.",
    recommendedFeature: "Inbox",
    route: "/capture",
    color: "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-300",
    whyThisFeature: "Keranjang penampung kilat. Catat apapun dalam 5 detik agar kepala Anda kembali lega dan bisa langsung melanjutkan kerja tanpa terdistraksi.",
    howToSteps: [
      "Buka 'Inbox' (/capture) kapanpun ada ide atau pengingat mendadak.",
      "Ketik catatan singkat (contoh: 'Ingat perpanjang SIM', 'Ide hadiah ulang tahun ibu').",
      "Klik Simpan, lalu kembali fokus ke pekerjaan utama.",
      "Di sore hari, buka kembali Inbox dan klik 'Konversi' untuk mengubah catatan menjadi Tugas atau Target resmi.",
    ],
    connectedTo: "Catatan di Inbox bisa diubah menjadi Tugas atau Target hanya dengan satu klik tanpa mengetik ulang.",
  },
  {
    id: "need-deep-focus",
    icon: "⏱️",
    userGoal: "Saya ingin bekerja dengan konsentrasi tenang tanpa tergoda membuka media sosial",
    problemSolved: "Mudah teralihkan oleh notifikasi, sulit memulai pekerjaan, atau merasa seharian sibuk tetapi tidak tahu waktu habis untuk apa.",
    recommendedFeature: "Mode Fokus (Pomodoro)",
    route: "/focus",
    color: "from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-300",
    whyThisFeature: "Mode Fokus menggunakan metode jam pasir: 25 menit fokus penuh mengerjakan 1 tugas, dilanjutkan 5 menit istirahat ringan agar otak tetap segar dan tidak jenuh.",
    howToSteps: [
      "Buka menu 'Mode Fokus' (/focus).",
      "Pilih 1 tugas yang ingin diselesaikan sekarang.",
      "Klik 'Mulai Sesi' — timer 25 menit akan berjalan.",
      "Jauhkan handphone dan kerjakan tugas sampai alarm berbunyi.",
      "Ambil napas, minum air 5 menit, lalu ulangi jika ingin lanjut.",
    ],
    connectedTo: "Setiap menit fokus yang diselesaikan otomatis tercatat dan bisa dilihat di 'Progress & Refleksi → Statistik'.",
  },
  {
    id: "need-schedule",
    icon: "📅",
    userGoal: "Saya ingin melihat jadwal waktu kerja dan memastikan tidak ada agenda yang bentrok",
    problemSolved: "Jadwal rapat tumpang tindih, lupa janji temu penting, atau tidak menyisakan waktu tenang untuk diri sendiri.",
    recommendedFeature: "Kalender",
    route: "/calendar",
    color: "from-sky-500/20 to-indigo-500/10 border-sky-500/30 text-sky-300",
    whyThisFeature: "Kalender membantu melihat alokasi waktu mingguan dan bulanan, menandai jam kerja penting, dan memberitahu jika ada jadwal yang bertabrakan.",
    howToSteps: [
      "Buka menu 'Kalender' (/calendar).",
      "Pilih tampilan Mingguan atau Bulanan sesuai kebutuhan.",
      "Klik 'Tambah Event' untuk menjadwalkan kegiatan baru.",
      "Jika ada jadwal yang bertubrukan, MyLife akan menampilkan tanda peringatan.",
    ],
    connectedTo: "Jadwal yang dipasang di Kalender akan muncul otomatis di ringkasan menu 'Hari Ini'.",
  },
  {
    id: "need-priority-help",
    icon: "🔮",
    userGoal: "Saya bingung harus mengerjakan apa terlebih dahulu saat tugas terasa banyak",
    problemSolved: "Merasa kewalahan melihat puluhan hal yang harus dilakukan, bingung mana yang mendesak dan mana yang bisa ditunda.",
    recommendedFeature: "Progress & Refleksi — tab Wawasan AI",
    route: "/progress?tab=wawasan",
    color: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-300",
    whyThisFeature: "Tab 'Wawasan AI' di Progress & Refleksi menganalisis batas waktu dan tingkat kepentingan setiap tugas, lalu memberi petunjuk tugas mana yang paling layak diselesaikan duluan.",
    howToSteps: [
      "Buka 'Progress & Refleksi' (/progress), lalu klik tab 'Wawasan AI'.",
      "Lihat bagian 'Perlu Perhatian': tugas-tugas penting yang mendekati batas waktu.",
      "Ikuti rekomendasi urutan tugas yang diberikan sistem.",
      "Periksa skor Keseimbangan Hidup agar tidak ada pilar yang terabaikan.",
    ],
    connectedTo: "Gunakan saran dari Wawasan AI untuk memilih 3 tugas prioritas di menu 'Hari Ini'.",
  },
  {
    id: "need-weekly-eval",
    icon: "🪞",
    userGoal: "Saya ingin mengevaluasi pencapaian pekan ini dan menyiapkan diri untuk pekan depan",
    problemSolved: "Merasa bekerja keras terus-menerus tapi tidak sadar kemajuannya, atau mengulang kebiasaan buruk yang sama setiap minggu.",
    recommendedFeature: "Progress & Refleksi — tab Review Mingguan",
    route: "/progress",
    color: "from-fuchsia-500/20 to-rose-500/10 border-fuchsia-500/30 text-fuchsia-300",
    whyThisFeature: "Tab 'Review Mingguan' di Progress & Refleksi adalah jurnal santai 10 menit di akhir pekan untuk mensyukuri hal baik yang tercapai dan memperbaiki strategi minggu depan.",
    howToSteps: [
      "Buka 'Progress & Refleksi' (/progress) setiap Jumat sore atau Minggu malam.",
      "Tab 'Review Mingguan' sudah aktif secara default — lihat rangkuman otomatis jam fokus dan tugas selesai.",
      "Klik 'Tulis Review' pada masing-masing Target untuk menjawab pertanyaan refleksi.",
      "Tuliskan apa yang berjalan baik, hambatan yang dialami, dan rencana untuk minggu depan.",
    ],
    connectedTo: "Hasil evaluasi menjaga rantai kebiasaan baik dan memberi ketenangan mental sebelum memulai minggu baru.",
  },
];

// ==============================================================================
// 2. KAMUS LENGKAP SETIAP MENU (BAHASA MANUSIA YANG MUDAH DIPAHAMI)
// ==============================================================================
export const MENU_EXPLANATIONS: FeatureGuideItem[] = [
  {
    id: "menu-today",
    menuName: "Hari Ini",
    badge: "Meja Kerja Harian",
    icon: "☀️",
    route: "/today",
    simpleExplanation: "Halaman utama tempat Anda memulai hari. Di sini Anda melihat tugas hari ini, jadwal waktu, dan memilih 3 tugas paling penting agar fokus tidak terpecah.",
    whatYouCanDo: [
      "Melihat semua tugas yang perlu diselesaikan hari ini.",
      "Memilih 3 tugas utama sebagai fokus utama hari ini.",
      "Melihat tugas yang mendekati atau melewati batas waktu.",
      "Mencentang tugas selesai dan melihat perolehan XP.",
    ],
    stepByStep: [
      "Buka 'Hari Ini' setiap pagi saat Anda siap memulai aktivitas.",
      "Lihat daftar tugas yang sudah tersusun otomatis dari Goals dan Proyek Anda.",
      "Pilih 1 tugas paling penting, klik tombol 'Mulai Fokus' untuk pindah ke Mode Fokus.",
    ],
    tips: "Tulis tugas dengan kata kerja yang jelas. Contoh: 'Telepon dokter gigi untuk jadwal periksa', bukan cuma 'Dokter'.",
  },
  {
    id: "menu-focus",
    menuName: "Mode Fokus",
    badge: "Bekerja Tenang",
    icon: "🎯",
    route: "/focus",
    simpleExplanation: "Ruang kerja tenang dengan pengatur waktu Pomodoro (25 menit kerja + 5 menit istirahat). Membantu Anda fokus mengerjakan satu tugas sampai tuntas tanpa gangguan.",
    whatYouCanDo: [
      "Memilih satu tugas dari daftar untuk dikerjakan sekarang.",
      "Menjalankan timer 25 menit kerja dan 5 menit istirahat.",
      "Mencatat catatan kecil atau ide yang muncul selama sesi.",
      "Melihat riwayat sesi kerja yang sudah berhasil diselesaikan.",
    ],
    stepByStep: [
      "Pilih tugas dari daftar yang tersedia di layar.",
      "Klik 'Mulai Sesi' dan letakkan handphone di tempat yang tidak terlihat.",
      "Bekerjalah dengan tenang sampai timer berbunyi, lalu ambil istirahat sejenak.",
    ],
    tips: "Satu tugas yang dikerjakan 25 menit penuh jauh lebih berdampak daripada seharian di depan laptop sambil multitasking.",
  },
  {
    id: "menu-calendar",
    menuName: "Kalender",
    badge: "Pengatur Waktu",
    icon: "📅",
    route: "/calendar",
    simpleExplanation: "Melihat jadwal harian, mingguan, dan bulanan Anda dalam satu tampilan. Tambahkan janji temu, rapat, atau waktu khusus agar tidak bertabrakan.",
    whatYouCanDo: [
      "Menambahkan jadwal janji temu, rapat, atau waktu olahraga.",
      "Melihat jadwal dalam tampilan mingguan atau bulanan.",
      "Mengetahui jika ada dua kegiatan yang bertabrakan di jam yang sama.",
      "Melihat pembagian alokasi waktu antara pekerjaan dan urusan pribadi.",
    ],
    stepByStep: [
      "Buka menu 'Kalender'.",
      "Pilih tampilan Mingguan atau Bulanan.",
      "Klik tombol 'Tambah Event' untuk menjadwalkan kegiatan baru.",
    ],
    tips: "Selalu sisakan ruang kosong 30 menit antar kegiatan penting sebagai waktu jeda untuk bernapas dan bersiap.",
  },
  {
    id: "menu-direction",
    menuName: "Arah & Identitas",
    badge: "Kompas Hidup",
    icon: "🧭",
    route: "/direction",
    simpleExplanation: "Halaman untuk mendefinisikan siapa Anda dan ke mana Anda menuju. Berisi identitas diri, visi jangka panjang, babak kehidupan saat ini, dan nilai-nilai hidup yang jadi pegangan.",
    whatYouCanDo: [
      "Menulis pernyataan identitas diri: siapa Anda dan apa yang Anda perjuangkan.",
      "Mendefinisikan visi hidup jangka panjang (5–10 tahun ke depan).",
      "Menentukan 'Babak Kehidupan' saat ini: fase apa yang sedang Anda jalani.",
      "Menulis 'Jurnal Refleksi Arah': evaluasi berkala apakah langkah hidup masih selaras dengan kompas diri.",
    ],
    stepByStep: [
      "Buka 'Arah & Identitas' (/direction).",
      "Isi tab 'Identitas' dengan pernyataan siapa Anda.",
      "Isi tab 'Visi' dengan gambaran hidup impian jangka panjang.",
      "Buka tab 'Jurnal Refleksi' sebulan sekali untuk menulis refleksi arah hidup.",
    ],
    tips: "Refleksi di menu ini bersifat strategis (arah hidup bulanan/tahunan). Sedangkan evaluasi operasional harian/mingguan atas target & tugas ada di menu 'Progress & Refleksi'.",
  },
  {
    id: "menu-goals",
    menuName: "Target & Proyek",
    badge: "Pusat Perencanaan",
    icon: "🚩",
    route: "/goals",
    simpleExplanation: "Satu halaman untuk mengelola semua rencana: Target jangka panjang (Goals), Proyek ber-deadline (Projects), dan Pilar Hidup (Areas). Ketiganya terhubung dan bisa diakses lewat tab di bagian atas.",
    whatYouCanDo: [
      "Tab 'Target (Goals)': Buat dan pantau impian jangka menengah sampai panjang.",
      "Tab 'Proyek (Projects)': Kelola rencana kerja ber-deadline dengan tonggak capaian.",
      "Tab 'Pilar Hidup (Areas)': Tentukan aspek-aspek hidup penting yang perlu dijaga seimbang.",
      "Kaitkan Goals dan Projects ke Pilar Hidup agar tidak ada aspek yang terabaikan.",
    ],
    stepByStep: [
      "Buka 'Target & Proyek' (/goals).",
      "Pilih tab sesuai kebutuhan: Goals untuk impian, Projects untuk proyek ber-deadline, Areas untuk pilar hidup.",
      "Klik tombol 'Tambah' di tab yang sesuai untuk membuat entri baru.",
    ],
    tips: "Mulai dari tab 'Pilar Hidup' untuk menentukan fondasi, lalu buat Goals dan Projects yang selaras dengan pilar-pilar tersebut.",
  },
  {
    id: "menu-capture",
    menuName: "Inbox",
    badge: "Penampung Kilat",
    icon: "📥",
    route: "/capture",
    simpleExplanation: "Keranjang penampung cepat untuk semua ide liar, catatan kilat, atau tugas mendadak. Catatkan dalam 5 detik agar pikiran kembali lega dan fokus tidak terganggu.",
    whatYouCanDo: [
      "Menuliskan ide spontan atau catatan singkat seketika tanpa ribet.",
      "Mengosongkan pikiran dari beban mengingat-ingat hal kecil.",
      "Mengubah catatan menjadi Tugas atau Target resmi hanya dengan 1 tombol.",
      "Menghapus catatan yang sudah tidak diperlukan.",
    ],
    stepByStep: [
      "Buka 'Inbox' kapanpun ada pikiran yang melintas.",
      "Ketik catatan singkat lalu klik Simpan.",
      "Di waktu luang, buka kembali dan klik 'Konversi' untuk menjadikannya Tugas.",
    ],
    tips: "Jangan biarkan ide cemerlang hanya mengendap di kepala. Catat segera di Inbox!",
  },
  {
    id: "menu-progress",
    menuName: "Progress & Refleksi",
    badge: "Pusat Evaluasi",
    icon: "📊",
    route: "/progress",
    simpleExplanation: "Satu halaman untuk semua kebutuhan evaluasi. Berisi 4 tab: Review Mingguan (ritual akhir pekan), Statistik (grafik performa), Wawasan AI (rekomendasi cerdas), dan Log Aktivitas (riwayat sesi).",
    whatYouCanDo: [
      "Tab 'Review Mingguan': Lakukan ritual evaluasi akhir pekan per Target.",
      "Tab 'Statistik': Lihat grafik tren jam fokus, heatmap aktivitas, dan streak harian.",
      "Tab 'Wawasan AI': Dapatkan rekomendasi tugas prioritas dan skor Keseimbangan Hidup.",
      "Tab 'Log Aktivitas': Lihat riwayat lengkap semua sesi kerja dan catatan.",
    ],
    stepByStep: [
      "Buka 'Progress & Refleksi' (/progress).",
      "Pilih tab sesuai tujuan: Review untuk evaluasi mingguan, Statistik untuk grafik performa.",
      "Untuk wawasan AI tentang prioritas, klik tab 'Wawasan AI'.",
    ],
    tips: "Jadikan Review Mingguan ritual rutin setiap Jumat sore — hanya butuh 10 menit untuk dampak besar dalam ketenangan mental.",
  },
  {
    id: "menu-assistant",
    menuName: "Life Copilot AI",
    badge: "Asisten Cerdas",
    icon: "✨",
    route: "/assistant",
    simpleExplanation: "Asisten AI personal yang memahami seluruh konteks sistem Anda. Tanya apapun dalam bahasa natural — dari merencanakan minggu depan hingga membuat Goals baru lewat perintah suara.",
    whatYouCanDo: [
      "Bertanya tentang status Goals dan Tasks Anda dalam bahasa sehari-hari.",
      "Meminta AI membuat Goals, Tasks, atau jadwal baru secara langsung.",
      "Mendapatkan saran strategi dan prioritas berdasarkan data aktual Anda.",
      "Menganalisis pola kerja dan kebiasaan Anda dari riwayat sesi.",
    ],
    stepByStep: [
      "Buka 'Life Copilot AI' (/assistant).",
      "Ketik pertanyaan dalam bahasa natural, misal: 'Apa saja tugas urgent minggu ini?'",
      "AI akan membaca data Anda dan memberikan jawaban yang kontekstual.",
    ],
    tips: "Coba ketik: 'Buat Goal baru: Baca 12 buku tahun ini' — AI bisa langsung membuat Goal tersebut ke dalam sistem tanpa perlu pindah halaman.",
  },
  {
    id: "menu-notifications",
    menuName: "Notifikasi",
    badge: "Pengingat Aktif",
    icon: "🔔",
    route: "/notifications",
    simpleExplanation: "Pusat pemberitahuan yang mengingatkan Anda sebelum batas waktu tugas terlambat dan memberi kabar saat ada jadwal penting yang akan dimulai.",
    whatYouCanDo: [
      "Melihat daftar pengingat tugas yang jatuh tempo hari ini.",
      "Menerima peringatan otomatis agar tidak ada janji yang terlewat.",
      "Menandai pesan pengingat yang sudah selesai dibaca.",
    ],
    stepByStep: [
      "Klik ikon lonceng atau buka menu Notifikasi.",
      "Klik tautan pada pengingat untuk langsung menuju tugas atau jadwal terkait.",
    ],
    tips: "Hubungkan notifikasi dengan bot Telegram di menu Pengaturan agar pengingat muncul langsung di handphone.",
  },
  {
    id: "menu-settings",
    menuName: "Pengaturan",
    badge: "Kedaulatan Data",
    icon: "⚙️",
    route: "/settings",
    simpleExplanation: "Tempat mengatur profil akun, preferensi tema, saluran pengingat Telegram, dan mengunduh salinan lengkap data Anda dalam format JSON kapanpun dibutuhkan.",
    whatYouCanDo: [
      "Memperbarui nama profil dan preferensi tampilan.",
      "Menghubungkan pengingat dengan akun Telegram pribadi.",
      "Mengunduh seluruh data (Target, Tugas, Sesi Fokus, Jadwal) dalam format file mandiri.",
      "Mengakhiri sesi akun dengan aman.",
    ],
    stepByStep: [
      "Buka menu 'Pengaturan' dari bagian bawah sidebar.",
      "Klik 'Unduh Cadangan JSON' kapanpun ingin menyimpan salinan data pribadi.",
    ],
    tips: "Data Anda adalah milik Anda sepenuhnya. Unduh cadangan secara berkala agar merasa tenang dan aman.",
  },
];

// ==============================================================================
// 3. CARA FITUR-FITUR SALING BEKERJA SAMA (HUBUNGAN TIMBAL BALIK)
// ==============================================================================
export const FEATURE_CONNECTIONS: FeatureConnectionExplainer[] = [
  {
    id: "conn-area-goal-task",
    title: "Alur Impian: Dari Pilar Hidup Menjadi Tugas Sehari-hari",
    icon: "🌳",
    analogy: "Ibarat Pohon Rindang: Pilar Hidup (Areas) adalah Akarnya, Target (Goals) adalah Batangnya, Tahapan adalah Cabangnya, dan Tugas (Tasks) adalah Daun yang Anda sirami setiap hari.",
    step1: {
      name: "Pilar Hidup ➡️ Target Impian",
      action: "Di 'Target & Proyek', tab 'Pilar Hidup', tentukan aspek utama hidup (misal: Kesehatan). Lalu di tab 'Target (Goals)', buat sasaran besar (misal: 'Mampu Berlari 5 KM Tanpa Henti') dan kaitkan ke pilar Kesehatan.",
    },
    step2: {
      name: "Target ➡️ Tugas Nyata ➡️ Kemajuan Otomatis",
      action: "Target dipecah menjadi Stages dan Tasks (misal: 'Jalan cepat 20 menit'). Setiap kali Anda menyelesaikan tugas di 'Hari Ini', bilah kemajuan Target bertambah naik otomatis!",
    },
    howTheyHelpYou: "Anda tidak akan pernah merasa 'mengerjakan tugas yang sia-sia', karena setiap centang tugas langsung menggerakkan impian Anda menuju kenyataan.",
    practicalExample: "Pilar: Karier ➡️ Target: Mahir Desain Grafis ➡️ Tugas: Latihan buat 1 poster ➡️ Progress target naik otomatis jadi 35%!",
  },
  {
    id: "conn-capture-to-task",
    title: "Alur Ide: Dari Catatan Spontan Menjadi Rencana Nyata",
    icon: "⚡",
    analogy: "Ibarat Keranjang Belanja: Masukkan semua belanjaan dulu ke keranjang (Inbox/Capture), lalu susun ke rak dapur saat waktu santai (Konversi).",
    step1: {
      name: "Catat Kilat di Inbox",
      action: "Saat fokus bekerja dan tiba-tiba teringat sesuatu, catat dalam 5 detik di 'Inbox' (/capture). Jangan langsung berpindah kerja agar konsentrasi tidak ambyar.",
    },
    step2: {
      name: "Ubah Menjadi Tugas Resmi",
      action: "Di sore hari, buka Inbox dan klik 'Konversi'. Ubah catatan mentah menjadi Tugas resmi dengan tanggal batas waktu yang jelas di 'Target & Proyek'.",
    },
    howTheyHelpYou: "Pikiran Anda selalu tenang saat bekerja, tanpa rasa takut ada ide bagus yang kelupaan.",
    practicalExample: "Saat mengetik laporan teringat 'Beli vitamin C' ➡️ Ketik di Inbox ➡️ Sore diubah jadi Tugas untuk besok pagi.",
  },
  {
    id: "conn-task-focus-pomodoro",
    title: "Alur Kerja: Dari Daftar Tugas Menjadi Jam Fokus Nyata",
    icon: "🔥",
    analogy: "Ibarat Restoran: 'Hari Ini' adalah Buku Menu, pilihan tugas adalah Makanan yang Dipesan, dan 'Mode Fokus Pomodoro' adalah Proses Memasaknya sampai matang.",
    step1: {
      name: "Pilih 3 Tugas Terpenting di 'Hari Ini'",
      action: "Dari seluruh daftar tugas, pilih HANYA 3 tugas utama. Abaikan yang lain untuk sementara agar pikiran tidak terbebani.",
    },
    step2: {
      name: "Nyalakan Pomodoro di 'Mode Fokus'",
      action: "Kerjakan tugas dalam ritme 25 menit fokus penuh. MyLife secara otomatis mencatat menit kerja ke dalam riwayat yang bisa dilihat di 'Progress & Refleksi → Statistik'.",
    },
    howTheyHelpYou: "Menghilangkan rasa pusing melihat to-do list panjang dan memberi bukti nyata bahwa waktu Anda dipakai untuk hal bermanfaat.",
    practicalExample: "Pilih Tugas 'Menulis Draft Presentasi' ➡️ Nyalakan 2 sesi Pomodoro (50 menit) ➡️ Draft selesai dan 50 menit tercatat di Statistik!",
  },
  {
    id: "conn-sessions-to-review",
    title: "Alur Pertumbuhan: Dari Jam Kerja Menjadi Pembelajaran Diri",
    icon: "📈",
    analogy: "Ibarat Spedometer: Sesi fokus mencatat seberapa jauh Anda melaju, sedangkan 'Review Mingguan' adalah waktu servis untuk mengecek kondisi kendaraan.",
    step1: {
      name: "Waktu Fokus Terkumpul Otomatis",
      action: "Semua sesi kerja Pomodoro dan tugas yang diselesaikan sepanjang minggu dirangkum rapi oleh MyLife di 'Progress & Refleksi → Statistik'.",
    },
    step2: {
      name: "Refleksi Santai Akhir Pekan",
      action: "Buka 'Progress & Refleksi' di akhir pekan, klik tab 'Review Mingguan' untuk melihat total jam kerja, mensyukuri pencapaian, dan merencanakan pekan berikutnya.",
    },
    howTheyHelpYou: "Anda punya bukti nyata atas perjuangan setiap minggu, sehingga kepercayaan diri dan kepuasan batin terus meningkat.",
    practicalExample: "Sistem merangkum: Pekan ini Anda berhasil fokus 14 jam dan menuntaskan 9 tugas penting. Hati pun merasa puas!",
  },
  {
    id: "conn-ai-copilot",
    title: "Alur Cerdas: Life Copilot AI sebagai Navigator Hidup Anda",
    icon: "🤖",
    analogy: "Ibarat Navigator GPS: AI membaca semua data rute Anda (Goals, Tasks, sesi), lalu memberikan petunjuk arah terbaik tanpa harus membuka setiap menu satu per satu.",
    step1: {
      name: "Tanya dalam Bahasa Natural",
      action: "Buka 'Life Copilot AI' (/assistant) dan ketik apapun: 'Apa prioritas saya minggu ini?', 'Bantu saya buat jadwal belajar', atau 'Buatkan Goal baru: Baca 10 buku tahun ini'.",
    },
    step2: {
      name: "AI Merespons dengan Data Nyata",
      action: "AI membaca seluruh konteks sistem Anda secara real-time dan memberikan jawaban atau tindakan yang langsung terhubung ke data aktual — bahkan bisa membuat Goal/Task baru langsung dari obrolan.",
    },
    howTheyHelpYou: "Anda tidak perlu hafal semua menu dan fitur. Cukup ceritakan situasinya ke AI, dan sistem akan mengarahkan Anda ke langkah yang tepat.",
    practicalExample: "Ketik: 'Aku mau mulai belajar coding, bantu buat roadmap-nya' ➡️ AI langsung membuat Goal + Stages + Tasks pertama untuk Anda!",
  },
];

// ==============================================================================
// 4. ALUR KERJA HARIAN IDEAL (DARI BANGUN PAGI SAMPAI AKHIR PEKAN)
// ==============================================================================
export const DAILY_WORKFLOW: DailyWorkflowPhase[] = [
  {
    time: "Pagi Hari (08:00 – 08:15)",
    phaseName: "1. Tentukan 3 Fokus Utama Hari Ini",
    icon: "☀️",
    whatYouFeel: "Baru bersiap memulai hari, ingin tahu hal terpenting apa yang harus diselesaikan agar hari ini terasa bermakna.",
    whatYouShouldDo: "Buka 'Hari Ini' (/today). Lihat tugas yang sudah tersusun dari Goals dan Proyek Anda. Pilih 3 tugas paling penting yang jika ketiga hal ini selesai, hari Anda sudah sukses.",
    menuToOpen: "Hari Ini",
    route: "/today",
    explanation: "Jangan membebani pikiran dengan puluhan to-do list di pagi hari. Kunci perhatian Anda hanya pada 3 hal penting agar tidak stres sejak awal.",
  },
  {
    time: "Siang Hari (09:00 – 16:00)",
    phaseName: "2. Bekerja Fokus & Tangkap Ide Spontan",
    icon: "⚡",
    whatYouFeel: "Sedang asyik bekerja, lalu tiba-tiba teringat tugas lain atau muncul ide mendadak yang menggoda untuk dikerjakan.",
    whatYouShouldDo: "Gunakan 'Mode Fokus' (/focus) untuk bekerja 25 menit dengan timer Pomodoro. Jika ada ide atau hal mendadak melintas, catat kilat di 'Inbox' (/capture) lalu lanjutkan pekerjaan utama.",
    menuToOpen: "Mode Fokus & Inbox",
    route: "/focus",
    explanation: "Lindungi konsentrasi Anda. Menuliskan ide kilat di Inbox membuat pikiran tetap tenang tanpa menghentikan pekerjaan utama.",
  },
  {
    time: "Sore Hari (16:30 – 17:00)",
    phaseName: "3. Rapikan Inbox & Tutup Hari dengan Tenang",
    icon: "🌆",
    whatYouFeel: "Energi kerja mulai surut, tugas-tugas utama sudah selesai, saatnya merapikan catatan sebelum beristirahat.",
    whatYouShouldDo: "Buka 'Inbox' (/capture). Ubah catatan ide tadi menjadi tugas untuk besok atau minggu depan, lalu centang tugas-tugas yang sudah selesai hari ini.",
    menuToOpen: "Inbox",
    route: "/capture",
    explanation: "Menutup meja kerja dengan rapi membuat malam hari bebas dari beban pikiran dan tidur menjadi lebih nyenyak.",
  },
  {
    time: "Akhir Pekan (Jumat Sore / Minggu Malam)",
    phaseName: "4. Ritual Review Mingguan — 10 Menit yang Mengubah Segalanya",
    icon: "🪞",
    whatYouFeel: "Satu pekan penuh telah terlewati, ingin melihat apa yang sudah dicapai dan menata hati untuk menyambut minggu baru.",
    whatYouShouldDo: "Buka 'Progress & Refleksi' (/progress) — tab 'Review Mingguan' sudah aktif secara default. Lihat rangkuman otomatis, klik 'Tulis Review' untuk setiap Target, dan tuliskan refleksi singkat.",
    menuToOpen: "Progress & Refleksi",
    route: "/progress",
    explanation: "Refleksi mingguan memastikan langkah hidup Anda bukan hanya sibuk, tapi benar-benar bergerak maju ke arah impian Anda. Cukup 10 menit, dampaknya luar biasa.",
  },
];
