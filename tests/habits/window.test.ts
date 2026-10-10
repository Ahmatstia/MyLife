import { describe, expect, it } from "vitest";
import {
  buildWindows,
  isValidTimezone,
  nextCheckinAfter,
  nextWindowEnd,
  parseLocalTime,
  periodDate,
} from "@/lib/habits/window";
import { d, JAKARTA, MAKASSAR, NEW_YORK } from "./helpers";

const iso = (date: Date) => date.toISOString();

describe("parseLocalTime / timezone", () => {
  it("menerima HH:mm valid dan menolak yang lain", () => {
    expect(parseLocalTime("06:00")).toEqual({ hour: 6, minute: 0 });
    expect(parseLocalTime("23:59")).toEqual({ hour: 23, minute: 59 });
    for (const bad of ["6:00", "24:00", "12:60", "", "06:00:00", "ab:cd"]) {
      expect(() => parseLocalTime(bad)).toThrow();
    }
  });

  it("memvalidasi zona IANA", () => {
    expect(isValidTimezone(JAKARTA)).toBe(true);
    expect(isValidTimezone("Mars/Olympus")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
    expect(() => nextCheckinAfter(d("2026-10-10T00:00:00Z"), "Mars/Olympus", "06:00")).toThrow();
  });

  it("menolak instan tidak valid", () => {
    expect(() => nextCheckinAfter(new Date("x"), JAKARTA, "06:00")).toThrow();
    expect(() => periodDate(new Date("x"), JAKARTA)).toThrow();
    expect(() =>
      buildWindows({ timezone: JAKARTA, checkinLocalTime: "06:00" }, new Date("x"), d("2026-10-10T00:00:00Z")),
    ).toThrow();
  });
});

describe("nextCheckinAfter", () => {
  it("06:00 WIB: sebelum jam -> hari yang sama; sesudah -> besok", () => {
    // 10 Okt 05:00 WIB -> 10 Okt 06:00 WIB (= 09 Okt 23:00Z)
    expect(iso(nextCheckinAfter(d("2026-10-09T22:00:00Z"), JAKARTA, "06:00"))).toBe("2026-10-09T23:00:00.000Z");
    // 10 Okt 13:30 WIB -> 11 Okt 06:00 WIB
    expect(iso(nextCheckinAfter(d("2026-10-10T06:30:00Z"), JAKARTA, "06:00"))).toBe("2026-10-10T23:00:00.000Z");
  });

  it("selalu benar-benar sesudah t (t tepat pada jam check-in -> hari berikutnya)", () => {
    const exact = d("2026-10-09T23:00:00Z"); // 06:00 WIB
    expect(iso(nextCheckinAfter(exact, JAKARTA, "06:00"))).toBe("2026-10-10T23:00:00.000Z");
  });
});

describe("periodDate", () => {
  it("check-in 06:00 pada 11 Okt -> 10 Okt (desain §8.1)", () => {
    expect(periodDate(d("2026-10-10T23:00:00Z"), JAKARTA)).toBe("2026-10-10"); // 11 Okt 06:00 WIB
  });

  it("check-in 20:00 pada 10 Okt -> 10 Okt (desain §8.1)", () => {
    expect(periodDate(d("2026-10-10T13:00:00Z"), JAKARTA)).toBe("2026-10-10"); // 10 Okt 20:00 WIB
  });

  it("memakai tanggal lokal zona, bukan UTC", () => {
    // 06:00 WITA 11 Okt = 10 Okt 22:00Z; minus 12 jam = 18:00 WITA 10 Okt
    expect(periodDate(d("2026-10-10T22:00:00Z"), MAKASSAR)).toBe("2026-10-10");
    // 00:30 WIB 11 Okt - 12 jam = 12:30 WIB 10 Okt
    expect(periodDate(d("2026-10-10T17:30:00Z"), JAKARTA)).toBe("2026-10-10");
  });
});

describe("T-01: check-in 06:00 membuat satu jendela", () => {
  it("tick 06:00:30 setelah dibuat pukul 13:30 -> tepat satu jendela", () => {
    const startedAt = d("2026-10-10T06:30:00Z"); // 10 Okt 13:30 WIB
    const windows = buildWindows(
      { timezone: JAKARTA, checkinLocalTime: "06:00" },
      startedAt,
      d("2026-10-10T23:00:30Z"), // 11 Okt 06:00:30 WIB
    );
    expect(windows).toHaveLength(1);
    expect(iso(windows[0].windowStart)).toBe("2026-10-10T06:30:00.000Z");
    expect(iso(windows[0].windowEnd)).toBe("2026-10-10T23:00:00.000Z");
    expect(windows[0].periodDate).toBe("2026-10-10");
  });

  it("sebelum jam check-in tidak ada jendela", () => {
    const windows = buildWindows(
      { timezone: JAKARTA, checkinLocalTime: "06:00" },
      d("2026-10-10T06:30:00Z"),
      d("2026-10-10T22:59:59Z"),
    );
    expect(windows).toEqual([]);
  });

  it("memakai nextCheckinAt tersimpan sebagai akhir jendela pertama", () => {
    const windows = buildWindows(
      { timezone: JAKARTA, checkinLocalTime: "06:00", nextCheckinAt: d("2026-10-10T23:00:00Z") },
      d("2026-10-10T06:30:00Z"),
      d("2026-10-11T23:30:00Z"),
    );
    expect(windows.map((w) => iso(w.windowEnd))).toEqual([
      "2026-10-10T23:00:00.000Z",
      "2026-10-11T23:00:00.000Z",
    ]);
  });

  it("nextCheckinAt basi (<= from) diabaikan", () => {
    const windows = buildWindows(
      { timezone: JAKARTA, checkinLocalTime: "06:00", nextCheckinAt: d("2026-10-01T00:00:00Z") },
      d("2026-10-10T06:30:00Z"),
      d("2026-10-10T23:30:00Z"),
    );
    expect(windows).toHaveLength(1);
  });

  it("menolak max tidak valid", () => {
    expect(() =>
      buildWindows({ timezone: JAKARTA, checkinLocalTime: "06:00" }, d("2026-10-10T00:00:00Z"), d("2026-10-12T00:00:00Z"), -1),
    ).toThrow();
  });
});

describe("T-03: catch-up setelah downtime", () => {
  const habit = { timezone: JAKARTA, checkinLocalTime: "06:00" };

  it("server mati 3 hari -> 3 jendela berurutan tanpa celah", () => {
    const currentWindowStart = d("2026-10-10T23:00:00Z"); // 11 Okt 06:00 WIB
    const windows = buildWindows(habit, currentWindowStart, d("2026-10-13T23:30:00Z")); // 14 Okt 06:30 WIB
    expect(windows).toHaveLength(3);
    expect(windows.map((w) => w.periodDate)).toEqual(["2026-10-11", "2026-10-12", "2026-10-13"]);
    expect(iso(windows[0].windowStart)).toBe(iso(currentWindowStart));
    for (let i = 1; i < windows.length; i++) {
      expect(iso(windows[i].windowStart)).toBe(iso(windows[i - 1].windowEnd));
    }
  });

  it("dibatasi 14 jendela per panggilan; sisanya dilanjutkan dari akhir jendela terakhir", () => {
    const from = d("2026-10-10T23:00:00Z");
    const to = d("2026-11-10T23:30:00Z"); // 31 hari
    const first = buildWindows(habit, from, to);
    expect(first).toHaveLength(14);

    const second = buildWindows(habit, first[13].windowEnd, to);
    expect(second).toHaveLength(14);
    expect(iso(second[0].windowStart)).toBe(iso(first[13].windowEnd));

    const third = buildWindows(habit, second[13].windowEnd, to);
    expect(third).toHaveLength(3);

    const all = [...first, ...second, ...third];
    expect(new Set(all.map((w) => w.periodDate)).size).toBe(31);
  });

  it("max kustom dihormati", () => {
    expect(buildWindows(habit, d("2026-10-10T23:00:00Z"), d("2026-10-20T23:00:00Z"), 2)).toHaveLength(2);
    expect(buildWindows(habit, d("2026-10-10T23:00:00Z"), d("2026-10-20T23:00:00Z"), 0)).toHaveLength(0);
  });

  it("memanggil ulang dengan masukan sama menghasilkan hasil sama (idempoten)", () => {
    const a = buildWindows(habit, d("2026-10-10T23:00:00Z"), d("2026-10-13T23:30:00Z"));
    const b = buildWindows(habit, d("2026-10-10T23:00:00Z"), d("2026-10-13T23:30:00Z"));
    expect(a).toEqual(b);
  });
});

describe("T-04: pindah zona Asia/Jakarta -> Asia/Makassar", () => {
  it("jendela berikutnya mengikuti zona baru, riwayat tetap", () => {
    const history = buildWindows(
      { timezone: JAKARTA, checkinLocalTime: "06:00" },
      d("2026-10-09T23:00:00Z"),
      d("2026-10-10T23:30:00Z"),
    );
    expect(history).toHaveLength(1);
    const snapshot = JSON.parse(JSON.stringify(history));

    const lastEnd = history[0].windowEnd; // 11 Okt 06:00 WIB
    const next = buildWindows(
      { timezone: MAKASSAR, checkinLocalTime: "06:00" },
      lastEnd,
      d("2026-10-11T23:00:00Z"),
    );
    expect(next).toHaveLength(1);
    // 12 Okt 06:00 WITA = 11 Okt 22:00Z (jendela 23 jam)
    expect(iso(next[0].windowEnd)).toBe("2026-10-11T22:00:00.000Z");
    expect(next[0].periodDate).toBe("2026-10-11");

    expect(JSON.parse(JSON.stringify(history))).toEqual(snapshot);
  });
});

describe("T-05: zona ber-DST (America/New_York, 2026)", () => {
  const habit06 = { timezone: NEW_YORK, checkinLocalTime: "06:00" };

  it("lompat maju 8 Mar: satu jendela per hari, tanpa loncat/duplikat", () => {
    const from = d("2026-03-05T11:00:00Z"); // 5 Mar 06:00 EST
    const windows = buildWindows(habit06, from, d("2026-03-12T12:00:00Z"));
    expect(windows).toHaveLength(7);
    expect(windows.map((w) => w.periodDate)).toEqual([
      "2026-03-05", "2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10", "2026-03-11",
    ]);
    // 7 Mar 06:00 EST = 11:00Z; 8 Mar 06:00 EDT = 10:00Z (jendela 23 jam)
    const mar8 = windows.find((w) => w.windowEnd.toISOString() === "2026-03-08T10:00:00.000Z");
    expect(mar8).toBeDefined();
    expect(mar8!.windowEnd.getTime() - mar8!.windowStart.getTime()).toBe(23 * 3600 * 1000);
  });

  it("jam yang hilang (02:30 pada 8 Mar) -> kejadian valid pertama sesudahnya (03:30 EDT), satu kali", () => {
    const windows = buildWindows(
      { timezone: NEW_YORK, checkinLocalTime: "02:30" },
      d("2026-03-06T07:30:00Z"), // 6 Mar 02:30 EST
      d("2026-03-11T12:00:00Z"),
    );
    expect(windows.map((w) => iso(w.windowEnd))).toEqual([
      "2026-03-07T07:30:00.000Z", // 7 Mar 02:30 EST
      "2026-03-08T07:30:00.000Z", // 8 Mar 03:30 EDT (02:30 tidak ada)
      "2026-03-09T06:30:00.000Z", // 9 Mar 02:30 EDT
      "2026-03-10T06:30:00.000Z",
      "2026-03-11T06:30:00.000Z",
    ]);
    expect(new Set(windows.map((w) => w.periodDate)).size).toBe(windows.length);
  });

  it("mundur 1 Nov: satu jendela per hari lokal, 25 jam pada hari peralihan", () => {
    const from = d("2026-10-29T10:00:00Z"); // 29 Okt 06:00 EDT
    const windows = buildWindows(habit06, from, d("2026-11-04T12:00:00Z"));
    expect(windows).toHaveLength(6);
    expect(new Set(windows.map((w) => w.periodDate)).size).toBe(6);
    const nov1 = windows.find((w) => w.windowEnd.toISOString() === "2026-11-01T11:00:00.000Z"); // 06:00 EST
    expect(nov1).toBeDefined();
    expect(nov1!.windowEnd.getTime() - nov1!.windowStart.getTime()).toBe(25 * 3600 * 1000);
  });

  it("jam ganda (01:30 pada 1 Nov): hanya kejadian pertama dipakai, tidak ada check-in kedua", () => {
    const windows = buildWindows(
      { timezone: NEW_YORK, checkinLocalTime: "01:30" },
      d("2026-10-30T05:30:00Z"), // 30 Okt 01:30 EDT
      d("2026-11-03T12:00:00Z"),
    );
    const ends = windows.map((w) => w.windowEnd.getTime());
    expect(new Set(ends).size).toBe(ends.length);
    // tepat satu akhir jendela per hari lokal
    expect(windows).toHaveLength(4);
    expect(new Set(windows.map((w) => w.periodDate)).size).toBe(4);
    // setelah kejadian pertama 1 Nov 01:30 EDT, berikutnya 2 Nov 01:30 EST (bukan 01:30 EST kedua hari yang sama)
    const afterFirst = nextCheckinAfter(d("2026-11-01T05:30:00Z"), NEW_YORK, "01:30");
    expect(iso(afterFirst)).toBe("2026-11-02T06:30:00.000Z");
    // t berada di antara dua kemunculan 01:30
    expect(iso(nextCheckinAfter(d("2026-11-01T05:45:00Z"), NEW_YORK, "01:30"))).toBe("2026-11-02T06:30:00.000Z");
  });
});

describe("T-17 (unit): ganti jam check-in", () => {
  it("riwayat tidak berubah; jendela berjalan dipendekkan sekali; jendela berikutnya mengikuti jam baru", () => {
    const history = buildWindows(
      { timezone: JAKARTA, checkinLocalTime: "06:00" },
      d("2026-10-09T23:00:00Z"),
      d("2026-10-11T23:30:00Z"),
    );
    expect(history).toHaveLength(2);
    const snapshot = JSON.parse(JSON.stringify(history));

    // Pengguna mengganti jam ke 20:00 pada 12 Okt 07:00 WIB; jendela berjalan mulai 12 Okt 06:00 WIB.
    const currentWindowStart = history[1].windowEnd;
    const changedAt = d("2026-10-12T00:00:00Z"); // 12 Okt 07:00 WIB
    const newNext = nextCheckinAfter(changedAt, JAKARTA, "20:00");
    expect(iso(newNext)).toBe("2026-10-12T13:00:00.000Z"); // 12 Okt 20:00 WIB (lebih pendek dari 24 jam)

    const future = buildWindows(
      { timezone: JAKARTA, checkinLocalTime: "20:00", nextCheckinAt: newNext },
      currentWindowStart,
      d("2026-10-13T14:00:00Z"),
    );
    expect(future.map((w) => iso(w.windowEnd))).toEqual([
      "2026-10-12T13:00:00.000Z",
      "2026-10-13T13:00:00.000Z",
    ]);
    expect(iso(future[0].windowStart)).toBe(iso(currentWindowStart));
    expect(future.map((w) => w.periodDate)).toEqual(["2026-10-12", "2026-10-13"]);

    expect(JSON.parse(JSON.stringify(history))).toEqual(snapshot);
  });

  it("ganti jam 20:00 ke 06:00 pada pukul 05:00: mencegah tabrakan periodDate dengan memperpanjang jendela", () => {
    // Jendela sebelumnya berakhir pada 9 Okt 20:00 WIB (13:00Z), periodDate = 2026-10-09
    const lastWindowEnd = d("2026-10-09T13:00:00Z");
    const lastPeriodDate = periodDate(lastWindowEnd, JAKARTA);
    expect(lastPeriodDate).toBe("2026-10-09");

    // Pada 10 Okt 05:00 WIB (9 Okt 22:00Z), user mengubah jam ke 06:00
    const changedAt = d("2026-10-09T22:00:00Z");

    // Jika tanpa guard, kemunculan 06:00 berikutnya adalah 10 Okt 06:00 WIB (9 Okt 23:00Z)
    const naiveNext = nextCheckinAfter(changedAt, JAKARTA, "06:00");
    expect(periodDate(naiveNext, JAKARTA)).toBe("2026-10-09"); // Tabrakan!

    // Dengan nextWindowEnd, kandidat dimajukan agar periodDate > lastPeriodDate
    const guardedNext = nextWindowEnd(lastWindowEnd, JAKARTA, "06:00", lastPeriodDate);
    // 11 Okt 06:00 WIB (10 Okt 23:00Z), periodDate = 2026-10-10
    expect(iso(guardedNext)).toBe("2026-10-10T23:00:00.000Z");
    expect(periodDate(guardedNext, JAKARTA)).toBe("2026-10-10");

    // buildWindows juga menerapkan pengaman ini
    const windows = buildWindows(
      { timezone: JAKARTA, checkinLocalTime: "06:00", lastPeriodDate },
      lastWindowEnd,
      d("2026-10-11T23:30:00Z"),
    );
    expect(windows[0].periodDate).toBe("2026-10-10");
    expect(iso(windows[0].windowStart)).toBe(iso(lastWindowEnd));
    expect(iso(windows[0].windowEnd)).toBe("2026-10-10T23:00:00.000Z");
  });
});
