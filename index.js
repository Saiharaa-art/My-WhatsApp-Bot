const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const http = require('http');

http.createServer((req, res) => { res.write('Bot Aktif'); res.end(); }).listen(process.env.PORT || 8000);

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesi_wa');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ["Naffdz Bot", "Chrome", "1.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) console.log("QR TERSEDIA DI CONSOLE!");
        if (connection === 'close') {
            let shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ BERHASIL TERHUBUNG!');
        }
    });

    sock.ev.on('messages.upsert', async (chat) => {
        const m = chat.messages[0];
        if (!m.message || m.key.fromMe) return;
        const from = m.key.remoteJid;
        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        if (body === 'ping') await sock.sendMessage(from, { text: 'PONG! Bot Hidup!' });
    });
}
startBot();
