export function clientOrigin(): string {
  return process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
}

export function httpPort(): number {
  const n = Number(process.env.PORT);
  return Number.isFinite(n) && n > 0 ? n : 3001;
}
