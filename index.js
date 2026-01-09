const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const http = require('http');

// SERVER BIAR KOYEB ON
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot Naffdz QR Ready');
}).listen(process.env.PORT || 8000);

async function startBot() {
  // Hapus manual folder sesi_wa di GitHub sebelum jalankan ini!
  const { state, saveCreds } = await useMultiFileAuthState('sesi_wa');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // INI YANG BIKIN QR MUNCUL DI CONSOLE
    browser: ["Naffdz-Bot", "Chrome", "1.0.0"]
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, qr } = update;
    if (qr) {
      console.log('--- SCAN QR DI BAWAH INI ---');
      qrcode.generate(qr, { small: true }); // PAKSA MUNCULKAN QR KECIL
      console.log('--- SCAN SEBELUM MATI ---');
    }
    if (connection === 'open') console.log('✅ BERHASIL TERHUBUNG!');
    if (connection === 'close') startBot();
  });
}
startBot();
