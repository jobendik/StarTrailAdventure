export function fmtTime(v: number): string {
  return String(Math.ceil(Math.max(0, v))).padStart(3, '0');
}

export function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}
