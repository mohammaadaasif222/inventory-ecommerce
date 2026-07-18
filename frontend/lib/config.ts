// 4200, not 4000: the HMS project on this machine owns 4000 (its dockerised
// frontend bakes that port into its build), so this stack moved. Keep the
// fallbacks in step with backend/.env `PORT` and frontend/.env.local.
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4200/api',
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4200',
} as const;
