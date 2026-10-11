export interface IndonesianCity {
  id: string;
  name: string;
  province: string;
  latitude: number;
  longitude: number;
  timezone: "Asia/Jakarta" | "Asia/Makassar" | "Asia/Jayapura";
  tzLabel: "WIB" | "WITA" | "WIT";
}

export const INDONESIAN_CITIES: IndonesianCity[] = [
  // DKI Jakarta
  { id: "jakarta", name: "Jakarta", province: "DKI Jakarta", latitude: -6.2088, longitude: 106.8456, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "kep-seribu", name: "Kepulauan Seribu", province: "DKI Jakarta", latitude: -5.6122, longitude: 106.5622, timezone: "Asia/Jakarta", tzLabel: "WIB" },

  // Jawa Barat
  { id: "bandung", name: "Bandung", province: "Jawa Barat", latitude: -6.9175, longitude: 107.6191, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "bekasi", name: "Bekasi", province: "Jawa Barat", latitude: -6.2383, longitude: 106.9756, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "bogor", name: "Bogor", province: "Jawa Barat", latitude: -6.5971, longitude: 106.806, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "depok", name: "Depok", province: "Jawa Barat", latitude: -6.4025, longitude: 106.7942, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "cirebon", name: "Cirebon", province: "Jawa Barat", latitude: -6.732, longitude: 108.5523, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "sukabumi", name: "Sukabumi", province: "Jawa Barat", latitude: -6.9277, longitude: 106.93, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "tasikmalaya", name: "Tasikmalaya", province: "Jawa Barat", latitude: -7.3274, longitude: 108.2207, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "cimahi", name: "Cimahi", province: "Jawa Barat", latitude: -6.8723, longitude: 107.542, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "karawang", name: "Karawang", province: "Jawa Barat", latitude: -6.3227, longitude: 107.3376, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "garut", name: "Garut", province: "Jawa Barat", latitude: -7.2278, longitude: 107.9087, timezone: "Asia/Jakarta", tzLabel: "WIB" },

  // Banten
  { id: "tangerang", name: "Tangerang", province: "Banten", latitude: -6.1783, longitude: 106.6319, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "tangerang-selatan", name: "Tangerang Selatan", province: "Banten", latitude: -6.2888, longitude: 106.7179, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "serang", name: "Serang", province: "Banten", latitude: -6.1104, longitude: 106.164, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "cilegon", name: "Cilegon", province: "Banten", latitude: -6.0024, longitude: 106.0128, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "pandeglang", name: "Pandeglang", province: "Banten", latitude: -6.3084, longitude: 106.1066, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "lebak", name: "Lebak (Rangkasbitung)", province: "Banten", latitude: -6.3638, longitude: 106.2486, timezone: "Asia/Jakarta", tzLabel: "WIB" },

  // Jawa Tengah
  { id: "semarang", name: "Semarang", province: "Jawa Tengah", latitude: -6.9667, longitude: 110.4167, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "surakarta", name: "Surakarta (Solo)", province: "Jawa Tengah", latitude: -7.5755, longitude: 110.8243, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "magelang", name: "Magelang", province: "Jawa Tengah", latitude: -7.4706, longitude: 110.2178, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "pekalongan", name: "Pekalongan", province: "Jawa Tengah", latitude: -6.8886, longitude: 109.6753, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "tegal", name: "Tegal", province: "Jawa Tengah", latitude: -6.8694, longitude: 109.1402, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "salatiga", name: "Salatiga", province: "Jawa Tengah", latitude: -7.3305, longitude: 110.5084, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "purwokerto", name: "Banyumas (Purwokerto)", province: "Jawa Tengah", latitude: -7.4243, longitude: 109.2302, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "kudus", name: "Kudus", province: "Jawa Tengah", latitude: -6.8048, longitude: 110.8405, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "cilacap", name: "Cilacap", province: "Jawa Tengah", latitude: -7.7176, longitude: 109.0076, timezone: "Asia/Jakarta", tzLabel: "WIB" },

  // DI Yogyakarta
  { id: "yogyakarta", name: "Yogyakarta", province: "DI Yogyakarta", latitude: -7.7956, longitude: 110.3695, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "sleman", name: "Sleman", province: "DI Yogyakarta", latitude: -7.7161, longitude: 110.3556, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "bantul", name: "Bantul", province: "DI Yogyakarta", latitude: -7.8878, longitude: 110.3284, timezone: "Asia/Jakarta", tzLabel: "WIB" },

  // Jawa Timur
  { id: "surabaya", name: "Surabaya", province: "Jawa Timur", latitude: -7.2575, longitude: 112.7521, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "malang", name: "Malang", province: "Jawa Timur", latitude: -7.9797, longitude: 112.6304, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "sidoarjo", name: "Sidoarjo", province: "Jawa Timur", latitude: -7.4478, longitude: 112.7183, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "gresik", name: "Gresik", province: "Jawa Timur", latitude: -7.1566, longitude: 112.6555, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "kediri", name: "Kediri", province: "Jawa Timur", latitude: -7.848, longitude: 112.0178, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "madiun", name: "Madiun", province: "Jawa Timur", latitude: -7.6298, longitude: 111.5239, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "jember", name: "Jember", province: "Jawa Timur", latitude: -8.1724, longitude: 113.7007, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "banyuwangi", name: "Banyuwangi", province: "Jawa Timur", latitude: -8.2192, longitude: 114.3691, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "probolinggo", name: "Probolinggo", province: "Jawa Timur", latitude: -7.7543, longitude: 113.2159, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "pasuruan", name: "Pasuruan", province: "Jawa Timur", latitude: -7.6453, longitude: 112.9075, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "batu", name: "Batu", province: "Jawa Timur", latitude: -7.8712, longitude: 112.5273, timezone: "Asia/Jakarta", tzLabel: "WIB" },

  // Sumatera Utara
  { id: "medan", name: "Medan", province: "Sumatera Utara", latitude: 3.5952, longitude: 98.6722, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "pematangsiantar", name: "Pematangsiantar", province: "Sumatera Utara", latitude: 2.9599, longitude: 99.0687, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "binjai", name: "Binjai", province: "Sumatera Utara", latitude: 3.6001, longitude: 98.4854, timezone: "Asia/Jakarta", tzLabel: "WIB" },

  // Sumatera Barat
  { id: "padang", name: "Padang", province: "Sumatera Barat", latitude: -0.9471, longitude: 100.4172, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "bukittinggi", name: "Bukittinggi", province: "Sumatera Barat", latitude: -0.3055, longitude: 100.3692, timezone: "Asia/Jakarta", tzLabel: "WIB" },

  // Riau
  { id: "pekanbaru", name: "Pekanbaru", province: "Riau", latitude: 0.5071, longitude: 101.4478, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "dumai", name: "Dumai", province: "Riau", latitude: 1.6671, longitude: 101.4431, timezone: "Asia/Jakarta", tzLabel: "WIB" },

  // Kepulauan Riau
  { id: "batam", name: "Batam", province: "Kepulauan Riau", latitude: 1.1301, longitude: 104.0529, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "tanjungpinang", name: "Tanjung Pinang", province: "Kepulauan Riau", latitude: 0.9167, longitude: 104.45, timezone: "Asia/Jakarta", tzLabel: "WIB" },

  // Sumatera Selatan
  { id: "palembang", name: "Palembang", province: "Sumatera Selatan", latitude: -2.9761, longitude: 104.7754, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "lubuklinggau", name: "Lubuklinggau", province: "Sumatera Selatan", latitude: -3.2964, longitude: 102.8625, timezone: "Asia/Jakarta", tzLabel: "WIB" },

  // Lampung
  { id: "bandar-lampung", name: "Bandar Lampung", province: "Lampung", latitude: -5.4294, longitude: 105.2625, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "metro", name: "Metro", province: "Lampung", latitude: -5.1136, longitude: 105.3067, timezone: "Asia/Jakarta", tzLabel: "WIB" },

  // Aceh
  { id: "banda-aceh", name: "Banda Aceh", province: "Aceh", latitude: 5.5483, longitude: 95.3238, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "lhokseumawe", name: "Lhokseumawe", province: "Aceh", latitude: 5.1801, longitude: 97.1407, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "sabang", name: "Sabang", province: "Aceh", latitude: 5.8933, longitude: 95.3164, timezone: "Asia/Jakarta", tzLabel: "WIB" },

  // Jambi & Bengkulu & Babel
  { id: "jambi", name: "Jambi", province: "Jambi", latitude: -1.6101, longitude: 103.6131, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "bengkulu", name: "Bengkulu", province: "Bengkulu", latitude: -3.8004, longitude: 102.2655, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "pangkalpinang", name: "Pangkal Pinang", province: "Kep. Bangka Belitung", latitude: -2.1316, longitude: 106.1169, timezone: "Asia/Jakarta", tzLabel: "WIB" },

  // Bali & Nusa Tenggara (WITA)
  { id: "denpasar", name: "Denpasar", province: "Bali", latitude: -8.6705, longitude: 115.2126, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "mataram", name: "Mataram (Lombok)", province: "Nusa Tenggara Barat", latitude: -8.5833, longitude: 116.1167, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "bima", name: "Bima", province: "Nusa Tenggara Barat", latitude: -8.4608, longitude: 118.7268, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "kupang", name: "Kupang", province: "Nusa Tenggara Timur", latitude: -10.1772, longitude: 123.607, timezone: "Asia/Makassar", tzLabel: "WITA" },

  // Kalimantan (WIB & WITA)
  { id: "pontianak", name: "Pontianak", province: "Kalimantan Barat", latitude: -0.0263, longitude: 109.3425, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "singkawang", name: "Singkawang", province: "Kalimantan Barat", latitude: 0.9069, longitude: 108.9868, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "palangkaraya", name: "Palangka Raya", province: "Kalimantan Tengah", latitude: -2.2161, longitude: 113.9166, timezone: "Asia/Jakarta", tzLabel: "WIB" },
  { id: "banjarmasin", name: "Banjarmasin", province: "Kalimantan Selatan", latitude: -3.3194, longitude: 114.5908, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "banjarbaru", name: "Banjarbaru", province: "Kalimantan Selatan", latitude: -3.4402, longitude: 114.8306, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "samarinda", name: "Samarinda", province: "Kalimantan Timur", latitude: -0.5022, longitude: 117.1537, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "balikpapan", name: "Balikpapan", province: "Kalimantan Timur", latitude: -1.2379, longitude: 116.8289, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "bontang", name: "Bontang", province: "Kalimantan Timur", latitude: 0.1333, longitude: 117.5, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "nusantara-ikn", name: "Ibu Kota Nusantara (IKN)", province: "Kalimantan Timur", latitude: -0.9744, longitude: 116.7056, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "tarakan", name: "Tarakan", province: "Kalimantan Utara", latitude: 3.3271, longitude: 117.5946, timezone: "Asia/Makassar", tzLabel: "WITA" },

  // Sulawesi (WITA)
  { id: "makassar", name: "Makassar", province: "Sulawesi Selatan", latitude: -5.1477, longitude: 119.4327, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "parepare", name: "Parepare", province: "Sulawesi Selatan", latitude: -4.0131, longitude: 119.6253, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "palopo", name: "Palopo", province: "Sulawesi Selatan", latitude: -2.9926, longitude: 120.1972, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "manado", name: "Manado", province: "Sulawesi Utara", latitude: 1.4748, longitude: 124.8428, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "bitung", name: "Bitung", province: "Sulawesi Utara", latitude: 1.445, longitude: 125.1889, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "palu", name: "Palu", province: "Sulawesi Tengah", latitude: -0.8917, longitude: 119.8707, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "kendari", name: "Kendari", province: "Sulawesi Tenggara", latitude: -3.9985, longitude: 122.5126, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "baubau", name: "Baubau", province: "Sulawesi Tenggara", latitude: -5.4632, longitude: 122.6012, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "gorontalo", name: "Gorontalo", province: "Gorontalo", latitude: 0.5435, longitude: 123.0568, timezone: "Asia/Makassar", tzLabel: "WITA" },
  { id: "mamuju", name: "Mamuju", province: "Sulawesi Barat", latitude: -2.6748, longitude: 118.8855, timezone: "Asia/Makassar", tzLabel: "WITA" },

  // Maluku & Maluku Utara (WIT)
  { id: "ambon", name: "Ambon", province: "Maluku", latitude: -3.6547, longitude: 128.1906, timezone: "Asia/Jayapura", tzLabel: "WIT" },
  { id: "ternate", name: "Ternate", province: "Maluku Utara", latitude: 0.7906, longitude: 127.3842, timezone: "Asia/Jayapura", tzLabel: "WIT" },
  { id: "tidore", name: "Tidore", province: "Maluku Utara", latitude: 0.6946, longitude: 127.4419, timezone: "Asia/Jayapura", tzLabel: "WIT" },

  // Papua (WIT)
  { id: "jayapura", name: "Jayapura", province: "Papua", latitude: -2.5337, longitude: 140.7181, timezone: "Asia/Jayapura", tzLabel: "WIT" },
  { id: "sorong", name: "Sorong", province: "Papua Barat Daya", latitude: -0.8762, longitude: 131.2558, timezone: "Asia/Jayapura", tzLabel: "WIT" },
  { id: "manokwari", name: "Manokwari", province: "Papua Barat", latitude: -0.8615, longitude: 134.062, timezone: "Asia/Jayapura", tzLabel: "WIT" },
  { id: "merauke", name: "Merauke", province: "Papua Selatan", latitude: -8.4991, longitude: 140.4011, timezone: "Asia/Jayapura", tzLabel: "WIT" },
  { id: "timika", name: "Mimika (Timika)", province: "Papua Tengah", latitude: -4.5467, longitude: 136.8839, timezone: "Asia/Jayapura", tzLabel: "WIT" },
  { id: "nabire", name: "Nabire", province: "Papua Tengah", latitude: -3.3667, longitude: 135.4833, timezone: "Asia/Jayapura", tzLabel: "WIT" },
  { id: "wamena", name: "Jayawijaya (Wamena)", province: "Papua Pegunungan", latitude: -4.0984, longitude: 138.9463, timezone: "Asia/Jayapura", tzLabel: "WIT" },
];

export const DEFAULT_CITY = INDONESIAN_CITIES[0]; // Jakarta

export function getCityById(id: string): IndonesianCity {
  return INDONESIAN_CITIES.find((c) => c.id === id) || DEFAULT_CITY;
}

/**
 * Calculates Haversine distance between two coordinates in kilometers.
 */
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find the nearest Indonesian city based on user's GPS coordinates.
 */
export function findNearestCity(latitude: number, longitude: number): IndonesianCity {
  let closest = DEFAULT_CITY;
  let minDistance = Infinity;

  for (const city of INDONESIAN_CITIES) {
    const dist = haversineDistanceKm(latitude, longitude, city.latitude, city.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closest = city;
    }
  }

  return closest;
}

/**
 * Search cities by query (case-insensitive across name and province).
 */
export function searchCities(query: string): IndonesianCity[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return INDONESIAN_CITIES;

  return INDONESIAN_CITIES.filter(
    (city) =>
      city.name.toLowerCase().includes(trimmed) ||
      city.province.toLowerCase().includes(trimmed) ||
      city.tzLabel.toLowerCase().includes(trimmed)
  );
}
