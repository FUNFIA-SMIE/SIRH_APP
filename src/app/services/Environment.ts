export const environment = {
  production: false,
  // Use the LAN IP of the API server so other devices can reach it.
  // Replace 192.168.88.46 by your server IP if different.
  apiUrl: 'http://192.168.88.46:3000',
  qrSecret: 'FUNFIA_SMIE_2026'       // ← DOIT correspondre à QR_SECRET dans .env Express
};