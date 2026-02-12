 /**
 * ISO week en UTC (Monday + FirstFourDayWeek) en réutilisant le Date donné.
 * (On clone dans un autre Date local pour ne pas muter d.)
 */
 export function isoWeekUTC_fromDateReused(d: Date): number {
    const t = d.getTime();
    const tmp = new Date(t);
    tmp.setUTCHours(0, 0, 0, 0);

    const day = (tmp.getUTCDay() + 6) % 7; // Monday=0..Sunday=6
    tmp.setUTCDate(tmp.getUTCDate() + 3 - day);

    const y = tmp.getUTCFullYear();
    const week1 = Date.UTC(y, 0, 4);

    const dayWeek1 = (new Date(week1).getUTCDay() + 6) % 7;
    const days = ((tmp.getTime() - week1) / 86400000) | 0;

    return 1 + (((days - 3 + dayWeek1) / 7) | 0);
 }

 export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function fmtUTCDate(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function parseAsUTCDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`);
}

export function addDaysUTC(d: Date, days: number) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

// interne
function isoWeekStartUTC(dateUTC: Date) {
  const d = new Date(dateUTC.getTime());
  d.setUTCHours(0, 0, 0, 0);
  const day = (d.getUTCDay() + 6) % 7; // Monday=0..Sunday=6
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

export function isoWeekWindowUTC(input: Date) {
  const start = isoWeekStartUTC(input);
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 7);
  end.setUTCSeconds(end.getUTCSeconds() - 1);
  return { start, end };
}
