export interface UserNeedGuide {
  id: string;
  icon: string;
  userGoal: string; // "Saya ingin..."
  problemSolved: string; // Masalah apa yang diselesaikan
  recommendedFeature: string; // Fitur yang harus dibuka
  route: string;
  color: string;
  howToSteps: string[];
  whyThisFeature: string;
  connectedTo: string; // Hubungannya dengan fitur lain
}

export interface FeatureGuideItem {
  id: string;
  menuName: string;
  badge: string;
  icon: string;
  route: string;
  simpleExplanation: string; // Penjelasan bahasa manusia biasa
  whatYouCanDo: string[]; // Apa saja yang bisa Anda lakukan di sini
  stepByStep: string[]; // Cara pakainya langkah demi langkah
  tips: string;
}

export interface DailyWorkflowPhase {
  time: string;
  phaseName: string;
  icon: string;
  whatYouFeel: string; // Kondisi user
  whatYouShouldDo: string; // Apa yang harus dilakukan
  menuToOpen: string;
  route: string;
  explanation: string;
}

export interface FeatureConnectionExplainer {
  id: string;
  title: string;
  icon: string;
  analogy: string; // Analogi yang gampang dipahami
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
    recommendedFeature: "Pilar Hidup (Areas) & Target (Goals)",
    route: "/areas",
    color: "from-violet-500/20 to-purple-500/10 border-violet-500/30 text-violet-300",
    whyThisFeature: "Pilar Hidup adalah bagian-bagian penting dalam hidup Anda (seperti Kesehatan, Karier, Keuangan, dan Keluarga). Target adalah cita-cita nyata yang ingin Anda capai di setiap pilar tersebut.",
    howToSteps: [
      "Buka menu 'Pilar Hidup' (/areas), lihat pilar utama hidup Anda (misalnya: Kesehatan, Karier, Keuangan, Hubungan Keluarga).",
      "Buka menu 'Target' (/goals), lalu buat impian atau sasaran yang ingin Anda raih dalam 3 sampai 12 bulan ke depan.",
      "Tautkan target tersebut ke pilar hidup yang sesuai agar hidup Anda seimbang dan terarah.",
      "Bagi target besar menjadi tahapan kecil yang santai agar tidak terasa berat saat mulai melangkah.",
    ],
    connectedTo: "Setiap tahapan target nantinya akan menjadi tugas harian di menu 'Hari Ini'. Saat tugas selesai, progres target Anda akan bertambah otomatis!",
  },
  {
    id: "need-manage-projects",
    icon: "📦",
    userGoal: "Saya punya proyek penting yang harus selesai sebelum batas waktu tertentu",
    problemSolved: "Punya rencana atau tugas besar tapi sering tertunda, lupa tenggat waktu, atau bingung membagi langkah-langkah pengerjaannya.",
    recommendedFeature: "Proyek (Projects)",
    route: "/projects",
    color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-300",
    whyThisFeature: "Menu Proyek dibuat untuk pekerjaan yang punya batas waktu (deadline) jelas dan hasil akhir yang pasti (contoh: Renovasi Rumah, Menulis Buku, Merilis Toko Online).",
    howToSteps: [
      "Buka menu 'Proyek' (/projects), lalu klik 'Tambah Proyek Baru'.",
      "Tentukan tanggal batas waktu (deadline) kapan proyek ini harus selesai.",
      "Buat beberapa tonggak capaian penting (Milestone) sebagai rambu perjalanan.",
      "Tuliskan tugas-tugas nyata yang perlu dikerjakan untuk mencapai setiap tonggak tersebut.",
    ],
    connectedTo: "Tugas di dalam proyek akan otomatis mengingatkan Anda di menu 'Hari Ini' saat tanggal batas waktu mulai mendekat.",
  },
  {
    id: "need-daily-tasks",
    icon: "✅",
    userGoal: "Saya ingin mengatur dan menyelesaikan tugas-tugas harian tanpa rasa panik",
    problemSolved: "Melihat daftar tugas menumpuk dan merasa kewalahan, tidak tahu harus mulai dari mana, atau sering menunda sampai malam hari.",
    recommendedFeature: "Hari Ini & Mode Fokus",
    route: "/today",
    color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300",
    whyThisFeature: "Menu 'Hari Ini' adalah meja kerja harian Anda. Anda bisa melihat tugas hari ini dengan rapi, lalu memilih 3 tugas terpenting agar pikiran tetap tenang dan tidak lelah.",
    howToSteps: [
      "Buka menu 'Hari Ini' (/today) di pagi hari untuk melihat apa saja yang perlu diselesaikan.",
      "Pilih 3 tugas paling penting yang ingin Anda prioritaskan hari ini.",
      "Klik tombol mulai fokus pada salah satu tugas untuk masuk ke Mode Fokus.",
      "Centang kotak tugas jika sudah selesai untuk merayakan kemajuan kecil Anda.",
    ],
    connectedTo: "Setiap tugas yang Anda centang selesai akan menambah catatan jam kerja, meningkatkan perolehan XP, dan memperbarui grafik kemajuan Anda.",
  },
  {
    id: "need-quick-capture",
    icon: "💡",
    userGoal: "Tiba-tiba terpikir ide cemerlang atau teringat tugas mendadak saat sedang sibuk",
    problemSolved: "Ide bagus sering terlupakan karena tidak langsung dicatat, atau pekerjaan utama terganggu karena langsung mengerjakan hal baru yang tiba-tiba melintas.",
    recommendedFeature: "Kotak Masuk (Capture / Inbox)",
    route: "/capture",
    color: "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-300",
    whyThisFeature: "Keranjang penampung kilat. Catat hal apapun dalam 5 detik agar kepala Anda kembali lega dan Anda bisa langsung melanjutkan kerja tanpa terdistraksi.",
    howToSteps: [
      "Buka 'Kotak Masuk' (/capture) kapan pun ada ide atau pengingat mendadak.",
      "Ketik catatan singkat (contoh: 'Ingat perpanjang SIM', 'Ide hadiah ulang tahun ibu').",
      "Klik Simpan dalam sekejap, lalu kembali fokus ke pekerjaan utama Anda.",
      "Di sore hari atau akhir pekan, buka menu ini dan klik 'Konversi' untuk mengubah catatan tersebut menjadi Tugas atau Target resmi.",
    ],
    connectedTo: "Catatan di Kotak Masuk bisa Anda ubah menjadi Tugas atau Target resmi hanya dengan satu kali klik tanpa perlu mengetik ulang.",
  },
  {
    id: "need-deep-focus",
    icon: "⏱️",
    userGoal: "Saya ingin bekerja dengan konsentrasi tenang tanpa tergoda membuka media sosial",
    problemSolved: "Mudah teralihkan oleh notifikasi handphone, sulit memulai pekerjaan, atau merasa seharian sibuk tetapi tidak tahu waktu habis untuk apa.",
    recommendedFeature: "Mode Fokus (Pomodoro & Stopwatch)",
    route: "/focus",
    color: "from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-300",
    whyThisFeature: "Mode Fokus menggunakan metode jam pasir: 25 menit fokus penuh mengerjakan 1 tugas, dilanjutkan 5 menit istirahat ringan agar otak tetap segar dan tidak jenuh.",
    howToSteps: [
      "Buka menu 'Mode Fokus' (/focus).",
      "Pilih 1 tugas yang ingin Anda selesaikan sekarang juga.",
      "Klik tombol 'Mulai Sesi' (timer 25 menit akan mulai berjalan santai).",
      "Jauhkan handphone dan kerjakan tugas tersebut sampai alarm berbunyi.",
      "Tarik napas, minum air putih selama 5 menit istirahat, lalu ulangi jika ingin lanjut.",
    ],
    connectedTo: "Setiap menit fokus yang Anda selesaikan akan otomatis tercatat di grafik mingguan Anda dan menjadi bahan evaluasi akhir pekan.",
  },
  {
    id: "need-schedule",
    icon: "📅",
    userGoal: "Saya ingin melihat jadwal waktu kerja dan memastikan tidak ada agenda yang bentrok",
    problemSolved: "Jadwal rapat tumpang tindih, lupa janji temu penting, atau tidak menyisakan waktu tenang untuk diri sendiri dan keluarga.",
    recommendedFeature: "Jadwal & Kalender",
    route: "/calendar",
    color: "from-sky-500/20 to-indigo-500/10 border-sky-500/30 text-sky-300",
    whyThisFeature: "Kalender membantu Anda melihat alokasi waktu mingguan dan bulanan, menandai jam kerja penting, dan memberitahu jika ada jadwal yang bertabrakan.",
    howToSteps: [
      "Buka menu 'Jadwal & Kalender' (/calendar).",
      "Lihat kalender mingguan atau klik tab 'Bulanan' untuk melihat jadwal sebulan penuh.",
      "Klik tombol tambah jadwal untuk memasukkan janji, rapat, atau waktu khusus untuk olahraga.",
      "Jika ada jadwal yang bertubrukan jamnya, MyLife akan menampilkan tanda peringatan agar bisa disesuaikan.",
    ],
    connectedTo: "Jadwal yang Anda pasang di Kalender akan muncul secara otomatis di rangkuman menu 'Hari Ini'.",
  },
  {
    id: "need-priority-help",
    icon: "🔮",
    userGoal: "Saya bingung harus mengerjakan apa terlebih dahulu saat tugas terasa banyak",
    problemSolved: "Merasa kewalahan melihat puluhan hal yang harus dilakukan, bingung mana yang mendesak dan mana yang bisa ditunda.",
    recommendedFeature: "Wawasan Cerdas (Insights)",
    route: "/insights",
    color: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-300",
    whyThisFeature: "MyLife menganalisis batas waktu dan tingkat kepentingan setiap tugas Anda, lalu memberi petunjuk ramah tugas mana yang paling layak diselesaikan duluan.",
    howToSteps: [
      "Buka menu 'Wawasan Cerdas' (/insights) saat Anda merasa ragu.",
      "Lihat bagian 'Perlu Perhatian': MyLife menandai hal-hal penting yang mendekati batas waktu.",
      "Lihat rekomendasi urutan tugas yang masuk akal dan aman dari rasa stres.",
      "Periksa diagram Keseimbangan Hidup untuk memastikan pilar kesehatan dan keluarga tidak terlupakan.",
    ],
    connectedTo: "Gunakan saran dari Wawasan Cerdas untuk memilih 3 tugas prioritas di menu 'Hari Ini'.",
  },
  {
    id: "need-weekly-eval",
    icon: "🪞",
    userGoal: "Saya ingin mengevaluasi pencapaian pekan ini dan menyiapkan diri untuk pekan depan",
    problemSolved: "Merasa bekerja keras terus-menerus tapi tidak sadar kemajuannya, atau mengulang kebiasaan buruk yang sama setiap minggu.",
    recommendedFeature: "Refleksi & Evaluasi (Review)",
    route: "/review",
    color: "from-fuchsia-500/20 to-rose-500/10 border-fuchsia-500/30 text-fuchsia-300",
    whyThisFeature: "Jurnal santai 10 menit di akhir pekan (Jumat sore atau Minggu malam) untuk mensyukuri hal baik yang tercapai dan memperbaiki strategi minggu depan.",
    howToSteps: [
      "Buka menu 'Refleksi & Evaluasi' (/review) saat pekan kerja hampir usai.",
      "Lihat rangkuman otomatis: berapa jam Anda berhasil fokus dan berapa tugas yang tuntas.",
      "Jawab beberapa pertanyaan refleksi mudah: Apa keberhasilan terbaik Anda? Apa kendala yang dihadapi?",
      "Tuliskan satu atau dua hal yang ingin Anda tingkatkan untuk minggu depan.",
    ],
    connectedTo: "Hasil evaluasi ini akan menjaga rantai kebiasaan baik Anda dan memberi ketenangan mental sebelum memulai minggu baru.",
  },
];

// ==============================================================================
// 2. KAMUS LENGKAP SETIAP MENU (BAHASA MANUSIA YANG MUDAH DIPAHAMI)
// ==============================================================================
export const MENU_EXPLANATIONS: FeatureGuideItem[] = [
  {
    id: "menu-today",
    menuName: "Hari Ini (Today)",
    badge: "Meja Kerja Harian",
    icon: "☀️",
    route: "/today",
    simpleExplanation: "Halaman utama tempat Anda memulai hari. Di sini Anda bisa melihat tugas hari ini, jadwal waktu, serta memilih 3 tugas paling penting agar fokus Anda tidak terpecah.",
    whatYouCanDo: [
      "Menuliskan tugas baru yang ingin Anda selesaikan hari ini.",
      "Memilih 3 tugas utama yang menjadi fokus utama hari ini.",
      "Melihat tugas yang sudah mendekati atau melewati batas waktu agar tidak lupa.",
      "Mencentang tugas selesai dan melihat perolehan poin kemajuan Anda.",
    ],
    stepByStep: [
      "Buka menu 'Hari Ini' setiap pagi saat Anda siap memulai aktivitas.",
      "Tuliskan tugas baru di kotak input atas jika ada hal baru.",
      "Pilih 1 tugas paling penting, lalu klik tombol fokus untuk mulai bekerja.",
    ],
    tips: "Tulis tugas dengan kata kerja yang jelas (contoh: 'Telepon dokter gigi untuk jadwal periksa', bukan cuma 'Dokter').",
  },
  {
    id: "menu-focus",
    menuName: "Mode Fokus (Focus Mode)",
    badge: "Bekerja Tenang",
    icon: "🎯",
    route: "/focus",
    simpleExplanation: "Ruang kerja tenang bebas gangguan dengan pengatur waktu (Pomodoro). Membantu Anda fokus mengerjakan satu tugas selama 25 menit sampai selesai.",
    whatYouCanDo: [
      "Memilih satu tugas yang ingin dikerjakan tanpa gangguan.",
      "Menjalankan timer 25 menit kerja dan 5 menit istirahat.",
      "Mencatat catatan kecil atau ide yang muncul selama sesi kerja.",
      "Melihat riwayat sesi kerja yang sudah berhasil Anda lewati hari ini.",
    ],
    stepByStep: [
      "Pilih tugas dari daftar tugas yang tersedia di layar.",
      "Klik 'Mulai Sesi' dan taruh handphone di tempat yang tidak terlihat.",
      "Bekerjalah dengan tenang sampai timer berbunyi, lalu ambil istirahat sejenak.",
    ],
    tips: "Satu tugas yang dikerjakan dengan fokus selama 25 menit jauh lebih berdampak daripada seharian di depan laptop tapi sambil scrolling media sosial.",
  },
  {
    id: "menu-calendar",
    menuName: "Jadwal & Kalender (Calendar)",
    badge: "Pengatur Waktu",
    icon: "📅",
    route: "/calendar",
    simpleExplanation: "Melihat jadwal harian, mingguan, dan bulanan Anda. Membantu Anda memesan waktu khusus untuk bekerja, janji temu, atau waktu istirahat agar tidak bertabrakan.",
    whatYouCanDo: [
      "Menambahkan jadwal janji temu, rapat, atau waktu khusus untuk olahraga.",
      "Melihat jadwal dalam tampilan mingguan atau tampilan bulanan penuh.",
      "Mengetahui jika ada dua kegiatan yang bertabrakan di jam yang sama.",
      "Melihat pembagian alokasi waktu antara pekerjaan dan urusan pribadi.",
    ],
    stepByStep: [
      "Buka menu 'Jadwal & Kalender'.",
      "Pilih tampilan Mingguan atau Bulanan sesuai kebutuhan Anda.",
      "Klik tombol 'Tambah Event' untuk menjadwalkan kegiatan baru.",
    ],
    tips: "Selalu sisakan ruang kosong 30 menit antar kegiatan penting sebagai waktu jeda untuk bernapas dan bersiap.",
  },
  {
    id: "menu-goals",
    menuName: "Target Impian (Goals)",
    badge: "Sasaran Masa Depan",
    icon: "🚩",
    route: "/goals",
    simpleExplanation: "Tempat menyimpan impian dan sasaran besar yang ingin Anda capai dalam 3 bulan hingga 1 tahun ke depan. Setiap target dapat dibagi menjadi beberapa tahapan kecil.",
    whatYouCanDo: [
      "Membuat target besar baru dan mengaitkannya ke pilar hidup Anda.",
      "Membagi target menjadi beberapa tahapan langkah (Stages) agar mudah dicicil.",
      "Melihat bilah persentase kemajuan yang otomatis bergerak naik saat tugas selesai.",
      "Melihat tugas berikutnya yang harus dikerjakan untuk target tersebut.",
    ],
    stepByStep: [
      "Klik 'Buat Target Baru' dan tuliskan impian Anda (misal: 'Membaca 12 Buku Tahun Ini').",
      "Tautkan target tersebut ke pilar yang sesuai (misal: Pilar 'Pengembangan Diri').",
      "Tambahkan beberapa tahapan kecil agar langkah Anda jelas.",
    ],
    tips: "Buat target yang realistis dan menggugah semangat Anda saat membacanya.",
  },
  {
    id: "menu-projects",
    menuName: "Proyek (Projects)",
    badge: "Tenggat Waktu Pasti",
    icon: "📁",
    route: "/projects",
    simpleExplanation: "Rencana kerja yang memiliki batas waktu (deadline) pasti dan hasil akhir konkret. Contoh: 'Mempersiapkan Liburan Keluarga' atau 'Menyelesaikan Laporan Akhir Tahun'.",
    whatYouCanDo: [
      "Memasang tanggal tenggat waktu (deadline) proyek.",
      "Membuat pos checkpoint (Milestone) sebagai tanda langkah kemajuan.",
      "Mengumpulkan seluruh tugas yang dibutuhkan agar proyek selesai tepat waktu.",
      "Memantau persentase kemajuan pengerjaan proyek secara transparan.",
    ],
    stepByStep: [
      "Buka menu 'Proyek' dan klik 'Tambah Proyek Baru'.",
      "Beri nama proyek dan tentukan tanggal batas penyelesaian.",
      "Tambahkan tugas-tugas detail yang perlu diselesaikan.",
    ],
    tips: "Jika suatu pekerjaan butuh lebih dari 3 langkah dan ada tanggal selesai, buatlah sebagai Proyek!",
  },
  {
    id: "menu-areas",
    menuName: "Pilar Hidup (Areas)",
    badge: "Pondasi Seumur Hidup",
    icon: "🧭",
    route: "/areas",
    simpleExplanation: "Bidang-bidang utama dalam hidup Anda yang perlu dijaga seumur hidup dan tidak pernah selesai. Contoh: Kesehatan, Finansial, Karier, Hubungan Keluarga, dan Hobi.",
    whatYouCanDo: [
      "Menentukan pilar-pilar penting dalam hidup Anda dengan warna khas.",
      "Melihat target dan proyek apa saja yang berjalan di bawah tiap pilar.",
      "Menjaga agar tidak ada aspek hidup yang terlantar (misal: sukses karier tapi lupa kesehatan).",
    ],
    stepByStep: [
      "Tentukan 4 sampai 6 pilar utama hidup Anda.",
      "Gunakan pilar ini saat membuat Target atau Proyek baru.",
    ],
    tips: "Pilar hidup tidak pernah berstatus 'Selesai', melainkan dirawat dan dijaga secara berkelanjutan.",
  },
  {
    id: "menu-capture",
    menuName: "Kotak Masuk (Capture / Inbox)",
    badge: "Penampung Kilat",
    icon: "📥",
    route: "/capture",
    simpleExplanation: "Keranjang penampung cepat untuk semua ide liar, catatan kilat, atau tugas mendadak. Anda bisa mencatatnya dalam 5 detik agar pikiran kembali lega.",
    whatYouCanDo: [
      "Menuliskan ide spontan atau catatan singkat seketika tanpa ribet.",
      "Mengosongkan pikiran dari beban mengingat-ingat hal kecil.",
      "Mengubah catatan menjadi Tugas atau Target resmi hanya dengan 1 tombol.",
      "Menghapus atau mengarsipkan catatan yang sudah tidak diperlukan.",
    ],
    stepByStep: [
      "Buka 'Kotak Masuk' kapan pun ada pikiran yang melintas.",
      "Ketik catatan singkat lalu klik Simpan.",
      "Di waktu luang, buka kembali catatan tersebut dan klik 'Konversi' untuk menjadikannya Tugas.",
    ],
    tips: "Jangan biarkan ide cemerlang hanya mengendap di kepala. Catat segera di Kotak Masuk!",
  },
  {
    id: "menu-review",
    menuName: "Refleksi & Evaluasi (Review)",
    badge: "Jurnal Akhir Pekan",
    icon: "🪞",
    route: "/review",
    simpleExplanation: "Jurnal evaluasi mingguan untuk melihat kembali perjalanan Anda selama sepekan: apa yang sudah tercapai, apa kendalanya, dan apa rencana untuk minggu depan.",
    whatYouCanDo: [
      "Melihat rangkuman total jam fokus dan jumlah tugas yang selesai pekan ini.",
      "Menuliskan hal-hal yang disyukuri dan pelajaran penting dari kendala yang dialami.",
      "Menyusun strategi perbaikan agar pekan depan lebih tenang dan teratur.",
    ],
    stepByStep: [
      "Buka menu 'Refleksi & Evaluasi' setiap Jumat sore atau Minggu malam.",
      "Luangkan waktu 10 menit untuk menjawab pertanyaan refleksi santai.",
      "Simpan jurnal refleksi untuk melihat pertumbuhan diri Anda dari waktu ke waktu.",
    ],
    tips: "Luangkan waktu 10 menit saja setiap akhir pekan. Kebiasaan ini akan memberi ketenangan luar biasa.",
  },
  {
    id: "menu-insights",
    menuName: "Wawasan Cerdas (Insights)",
    badge: "Petunjuk Otomatis",
    icon: "✨",
    route: "/insights",
    simpleExplanation: "Asisten cerdas yang membaca seluruh tugas dan jadwal Anda. Memberi tahu tugas mana yang paling mendesak, mendeteksi jadwal bentrok, dan menilai keseimbangan hidup.",
    whatYouCanDo: [
      "Melihat daftar tugas yang paling mendesak dan butuh tindakan segera.",
      "Melihat saran urutan prioritas tugas berdasarkan batas waktu.",
      "Melihat skor Keseimbangan Hidup untuk memeriksa apakah ada pilar hidup yang terabaikan.",
      "Mendapatkan saran ramah untuk alokasi waktu kerja Anda.",
    ],
    stepByStep: [
      "Buka Wawasan Cerdas saat Anda bingung menentukan tugas mana yang harus dikerjakan dulu.",
      "Ikuti saran urutan prioritas yang diberikan oleh sistem.",
    ],
    tips: "Periksa skor Keseimbangan Hidup secara berkala agar Anda tidak bekerja berlebihan sampai kelelahan.",
  },
  {
    id: "menu-dashboard",
    menuName: "Grafik & Analitik (Dashboard)",
    badge: "Statistik Nyata",
    icon: "📊",
    route: "/dashboard",
    simpleExplanation: "Rangkuman visual berupa grafik dan angka kemajuan Anda. Menampilkan total jam kerja, perolehan XP, tren produktivitas, dan status target-target Anda.",
    whatYouCanDo: [
      "Melihat grafik tren jam fokus kerja dari hari ke hari.",
      "Melihat pembagian persentase waktu antar pilar kehidupan.",
      "Melihat ringkasan target yang aktif dan proyek yang sedang berjalan.",
    ],
    stepByStep: [
      "Buka menu 'Grafik & Analitik' untuk melihat performa mingguan atau bulanan Anda.",
      "Gunakan data visual ini untuk memotivasi diri bahwa Anda terus berkembang.",
    ],
    tips: "Angka di grafik ini murni dihitung dari sesi fokus dan tugas yang benar-benar Anda selesaikan.",
  },
  {
    id: "menu-notifications",
    menuName: "Notifikasi & Pengingat",
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
      "Klik ikon lonceng atau buka menu Notifikasi untuk memeriksa pesan penting.",
      "Klik tautan pada pengingat untuk langsung menuju ke tugas atau jadwal terkait.",
    ],
    tips: "Anda juga bisa menghubungkan notifikasi dengan bot Telegram di menu Pengaturan agar pengingat muncul di handphone.",
  },
  {
    id: "menu-settings",
    menuName: "Pengaturan & Cadangan Data (Settings)",
    badge: "Kedaulatan Data",
    icon: "⚙️",
    route: "/settings",
    simpleExplanation: "Tempat mengatur profil akun, preferensi tema, saluran pengingat Telegram, dan mengunduh salinan lengkap seluruh data Anda dalam format file JSON kapan saja.",
    whatYouCanDo: [
      "Memperbarui nama profil dan preferensi tampilan aplikasi.",
      "Menghubungkan pengingat dengan akun Telegram pribadi Anda.",
      "Mengunduh seluruh data hidup Anda (Target, Tugas, Sesi Fokus, Jadwal) dalam format file mandiri.",
      "Mengakhiri sesi akun dengan aman di perangkat yang Anda gunakan.",
    ],
    stepByStep: [
      "Buka menu Pengaturan untuk menyesuaikan kenyamanan penggunaan MyLife.",
      "Klik tombol 'Unduh Cadangan JSON' kapan saja Anda ingin menyimpan salinan data pribadi.",
    ],
    tips: "Data Anda adalah milik Anda sepenuhnya. Unduh cadangan secara berkala agar Anda merasa tenang dan aman.",
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
    analogy: "Ibarat Pohon Rindang: Pilar Hidup (Area) adalah Akarnya, Target (Goal) adalah Batang Pohonnya, Tahapan adalah Cabangnya, dan Tugas (Task) adalah Daun yang Anda sirami setiap hari.",
    step1: {
      name: "Pilar Hidup ➡️ Target Impian",
      action: "Anda menentukan pilar hidup utama (misalnya: Kesehatan), lalu membuat target besar di bawahnya (misalnya: 'Mampu Berlari 5 Kilometer Tanpa Henti').",
    },
    step2: {
      name: "Target ➡️ Tugas Nyata ➡️ Kemajuan Otomatis",
      action: "Target tersebut dipecah menjadi tugas-tugas kecil (misal: 'Jalan cepat 20 menit'). Setiap kali Anda menyelesaikan tugas, bilah kemajuan target otomatis bertambah naik!",
    },
    howTheyHelpYou: "Anda tidak akan pernah merasa 'mengerjakan tugas yang sia-sia', karena setiap centang tugas yang Anda buat langsung menggerakkan impian hidup Anda menuju kenyataan.",
    practicalExample: "Pilar: Karier ➡️ Target: Mahir Desain Grafis ➡️ Tugas: Latihan membuat 1 poster ➡️ Kemajuan target Anda naik otomatis jadi 35%!",
  },
  {
    id: "conn-capture-to-task",
    title: "Alur Ide: Dari Catatan Spontan Menjadi Rencana Nyata",
    icon: "⚡",
    analogy: "Ibarat Keranjang Belanja: Anda memasukkan belanjaan ke keranjang terlebih dahulu (Capture), lalu menyusunnya ke rak dapur saat waktu santai di rumah (Konversi).",
    step1: {
      name: "Catat Kilat di Kotak Masuk",
      action: "Saat Anda sedang fokus bekerja dan tiba-tiba teringat sesuatu, catat dalam 5 detik di /capture. Jangan langsung berpindah kerja agar konsentrasi tidak ambyar.",
    },
    step2: {
      name: "Ubah Menjadi Tugas Resmi",
      action: "Di sore hari atau akhir pekan, buka Kotak Masuk dan klik 'Konversi'. Ubah catatan mentah tadi menjadi Tugas resmi dengan tanggal batas waktu yang jelas.",
    },
    howTheyHelpYou: "Pikiran Anda selalu tenang dan plong saat bekerja, tanpa rasa takut ada ide bagus yang kelupaan atau hilang begitu saja.",
    practicalExample: "Saat sedang mengetik laporan teringat 'Beli vitamin C' ➡️ Ketik di Kotak Masuk ➡️ Sore hari diubah jadi Tugas untuk dibeli besok pagi.",
  },
  {
    id: "conn-task-focus-pomodoro",
    title: "Alur Kerja: Dari Daftar Tugas Menjadi Jam Fokus Nyata",
    icon: "🔥",
    analogy: "Ibarat Restoran: Daftar Tugas adalah Buku Menunya, Pilihan Hari Ini adalah Makanan yang Dipesan, dan Mode Fokus Pomodoro adalah Proses Memasaknya sampai matang sempurna.",
    step1: {
      name: "Pilih 3 Tugas Terpenting",
      action: "Dari seluruh daftar tugas yang ada, pilih HANYA 3 tugas utama di menu 'Hari Ini'. Abaikan yang lain untuk sementara.",
    },
    step2: {
      name: "Nyalakan Jam Pasir Pomodoro",
      action: "Kerjakan tugas dalam ritme 25 menit fokus penuh. MyLife secara otomatis mencatat menit kerja Anda ke dalam catatan kemajuan.",
    },
    howTheyHelpYou: "Menghilangkan rasa pusing melihat to-do list yang panjang dan memberi bukti nyata bahwa waktu Anda dipakai untuk hal bermanfaat.",
    practicalExample: "Pilih Tugas 'Menulis Draft Presentasi' ➡️ Nyalakan 2 sesi Pomodoro (50 menit) ➡️ Draft selesai dan 50 menit kerja tercatat di grafik!",
  },
  {
    id: "conn-sessions-to-review",
    title: "Alur Pertumbuhan: Dari Jam Kerja Menjadi Pembelajaran Diri",
    icon: "📈",
    analogy: "Ibarat Spedometer Kendaraan: Sesi fokus mencatat seberapa jauh Anda melaju, sedangkan Refleksi Mingguan adalah waktu servis untuk mengecek kondisi dan kesehatan kendaraan.",
    step1: {
      name: "Waktu Fokus Terkumpul Otomatis",
      action: "Semua sesi kerja Pomodoro dan tugas yang Anda selesaikan sepanjang minggu dirangkum secara rapi oleh MyLife.",
    },
    step2: {
      name: "Refleksi Santai Akhir Pekan",
      action: "Buka menu /review di akhir pekan untuk melihat total jam kerja, mensyukuri pencapaian, dan merencanakan pekan berikutnya agar lebih rileks.",
    },
    howTheyHelpYou: "Anda memiliki bukti nyata atas perjuangan Anda setiap minggu, sehingga kepercayaan diri dan kepuasan batin Anda terus meningkat.",
    practicalExample: "Sistem merangkum: Pekan ini Anda berhasil fokus selama 14 jam dan menuntaskan 9 tugas penting. Hati pun merasa puas!",
  },
  {
    id: "conn-insights-telegram",
    title: "Alur Pengingat Ramah: Dari Jadwal Menjadi Pesan di HP Anda",
    icon: "📱",
    analogy: "Ibarat Sahabat Setia: MyLife mengamati jadwal dan batas waktu tugas Anda di balik layar, lalu menyapa lembut di handphone saat ada hal penting yang perlu diperhatikan.",
    step1: {
      name: "Pemeriksaan Jadwal Otomatis",
      action: "MyLife melihat bahwa hari ini ada tugas penting yang jatuh tempo atau ada jadwal rapat yang akan dimulai sebentar lagi.",
    },
    step2: {
      name: "Pengingat Otomatis Muncul",
      action: "Pemberitahuan muncul di aplikasi dan pesan pengingat terkirim ke Telegram pribadi Anda secara langsung.",
    },
    howTheyHelpYou: "Anda tidak perlu bolak-balik cemas memeriksa aplikasi sepanjang hari. MyLife yang akan mengingatkan Anda pada waktu yang tepat.",
    practicalExample: "Pukul 08:30 pagi HP Anda berdering ramah: '☀️ Selamat pagi! Ada 1 tugas prioritas yang jatuh tempo hari ini: Laporan Keuangan Bulanan'.",
  },
];

// ==============================================================================
// 4. ALUR KERJA HARIAN IDEAL (DARI BANGUN PAGI SAMPAI AKHIR PEKAN)
// ==============================================================================
export const DAILY_WORKFLOW: DailyWorkflowPhase[] = [
  {
    time: "Pagi Hari (08:00 - 08:30)",
    phaseName: "1. Menentukan 3 Fokus Utama Hari Ini",
    icon: "☀️",
    whatYouFeel: "Baru bersiap memulai hari, ingin tahu hal terpenting apa yang harus diselesaikan agar hari ini terasa bermakna.",
    whatYouShouldDo: "Buka menu 'Hari Ini' (/today). Pilih 3 tugas paling penting yang jika ketiga hal ini selesai, hari Anda sudah terhitung sukses.",
    menuToOpen: "Hari Ini",
    route: "/today",
    explanation: "Jangan membebani pikiran dengan puluhan to-do list di pagi hari. Kunci perhatian Anda hanya pada 3 hal penting agar tidak stres.",
  },
  {
    time: "Siang Hari (09:00 - 16:00)",
    phaseName: "2. Bekerja Fokus & Tangkap Ide Spontan",
    icon: "⚡",
    whatYouFeel: "Sedang asyik bekerja, lalu tiba-tiba teringat tugas lain atau muncul ide mendadak yang menggoda untuk langsung dikerjakan.",
    whatYouShouldDo: "Gunakan Mode Fokus (/focus) untuk bekerja 25 menit. Jika ada ide atau hal mendadak melintas, ketik kilat di 'Kotak Masuk' (/capture) lalu lanjutkan pekerjaan.",
    menuToOpen: "Mode Fokus & Kotak Masuk",
    route: "/focus",
    explanation: "Lindungi konsentrasi Anda. Menuliskan ide kilat di Kotak Masuk membuat pikiran tetap tenang tanpa menghentikan pekerjaan utama.",
  },
  {
    time: "Sore Hari (16:30 - 17:00)",
    phaseName: "3. Rapikan Catatan & Tutup Hari dengan Tenang",
    icon: "🌆",
    whatYouFeel: "Energi kerja mulai surut, tugas-tugas utama sudah selesai, saatnya merapikan sisa catatan sebelum beristirahat bersama keluarga.",
    whatYouShouldDo: "Buka 'Kotak Masuk' (/capture). Ubah catatan ide tadi menjadi tugas untuk besok, lalu centang tugas-tugas yang sudah selesai hari ini.",
    menuToOpen: "Kotak Masuk (Capture)",
    route: "/capture",
    explanation: "Menutup meja kerja dengan rapi membuat malam hari Anda bebas dari beban pikiran dan tidur pun menjadi lebih nyenyak.",
  },
  {
    time: "Akhir Pekan (Jumat / Minggu Malam)",
    phaseName: "4. Refleksi Santai 10 Menit & Merestart Energi",
    icon: "🪞",
    whatYouFeel: "Satu pekan penuh telah terlewati, ingin melihat apa saja yang sudah berhasil dicapai dan menata hati untuk menyambut minggu baru.",
    whatYouShouldDo: "Buka menu 'Refleksi & Evaluasi' (/review). Jawab pertanyaan singkat selama 10 menit untuk merayakan pencapaian dan menyiapkan langkah pekan depan.",
    menuToOpen: "Refleksi & Evaluasi",
    route: "/review",
    explanation: "Refleksi mingguan memastikan langkah hidup Anda bukan hanya sibuk, tapi benar-benar bergerak maju ke arah impian Anda.",
  },
];
