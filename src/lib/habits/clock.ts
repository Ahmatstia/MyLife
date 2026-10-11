/**
 * Jam yang dapat disuntik agar logika waktu bisa diuji tanpa menunggu waktu nyata.
 */
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** Jam palsu untuk tes: waktu hanya berubah lewat `set` / `advance`. */
export class FakeClock implements Clock {
  private current: number;

  constructor(start: Date | string | number) {
    this.current = FakeClock.toMillis(start);
  }

  now(): Date {
    return new Date(this.current);
  }

  set(to: Date | string | number): void {
    this.current = FakeClock.toMillis(to);
  }

  advance(ms: number): void {
    this.current += ms;
  }

  private static toMillis(value: Date | string | number): number {
    const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
    if (Number.isNaN(ms)) throw new Error("FakeClock: waktu tidak valid");
    return ms;
  }
}
