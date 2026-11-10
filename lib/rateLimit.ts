// 단순 인메모리 제한. 서버리스 인스턴스마다 따로 동작하므로 "완벽한 차단"이 아니라
// 남용을 줄이는 용도다. (엄격히 하려면 Upstash 등 외부 저장소 필요)
const WINDOW_MS = 60_000;
const MAX = 8;
const hits = new Map<string, number[]>();

export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX;
}
