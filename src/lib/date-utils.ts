export const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const dayOfWeek = d.getDay();
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - dayOfWeek);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    return date;
  });
}

/** DB timestamps are already KST — strip timezone suffix to prevent double conversion */
export function parseKST(dateStr: string): Date {
  return new Date(dateStr.replace(/([+-]\d{2}:?\d{2}|Z)$/, ""));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function calcWeekOffset(today: Date, target: Date): number {
  const toSunday = (d: Date) => {
    const s = new Date(d);
    s.setDate(s.getDate() - s.getDay());
    s.setHours(0, 0, 0, 0);
    return s;
  };
  const a = toSunday(today).getTime();
  const b = toSunday(target).getTime();
  return Math.round((b - a) / (7 * 24 * 60 * 60 * 1000));
}

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns today's date string in KST (UTC+9), safe for server-side use */
export function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}
