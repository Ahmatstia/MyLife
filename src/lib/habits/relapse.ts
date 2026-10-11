import { DEFAULT_RELAPSE_RULE, MS_PER_DAY } from "./constants";
import type { CheckinStatus } from "./status";

/**
 * RelapseDetector (desain §8.4, §12.4): pola kambuh bila jumlah jendela LAPSED
 * dalam `days` hari terakhir >= `count`. Jendela dihitung dari `windowEnd`.
 */

export interface RelapseRule {
  count: number;
  days: number;
}

export interface RelapseCheckinLike {
  windowEnd: Date;
  status: CheckinStatus;
}

export const RelapseDetector = {
  detect(
    checkins: readonly RelapseCheckinLike[],
    rule: RelapseRule = DEFAULT_RELAPSE_RULE,
    now: Date,
  ): boolean {
    if (!Number.isInteger(rule.count) || rule.count < 1) {
      throw new Error("rule.count harus bilangan bulat >= 1");
    }
    if (!Number.isInteger(rule.days) || rule.days < 1) {
      throw new Error("rule.days harus bilangan bulat >= 1");
    }
    const nowMs = now.getTime();
    const since = nowMs - rule.days * MS_PER_DAY;
    const lapsedWindows = checkins.filter((c) => {
      const end = c.windowEnd.getTime();
      return c.status === "LAPSED" && end >= since && end <= nowMs;
    });
    return lapsedWindows.length >= rule.count;
  },
};

export const detectRelapsePattern = RelapseDetector.detect;
