const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const http = require('http');
const axios = require('axios');

// Server biar ga dimatiin Koyeb (Pancingan Port)
http.createServer((req, res) => { res.write('Bot Naffdz Aktif'); res.end(); }).listen(process.env.PORT || 8000);

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesi_wa');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ["Naffdz Gacor", "Chrome", "1.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ BOT NAFFDZ SUDAH BANGUN & SIAP BALAS!');
        }
    });

    // INI BAGIAN YANG BIKIN BOT BISA JAWAB (UPSERT)
    sock.ev.on('messages.upsert', async (chat) => {
        try {
            const m = chat.messages[0];
            if (!m.message || m.key.fromMe) return;
            
            const from = m.key.remoteJid;
            const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || "";

            // Respon otomatis kalau ada yang chat !ai
            if (body.startsWith('!ai')) {
                const text = body.slice(4);
                if (!text) return sock.sendMessage(from, { text: 'Mau tanya apa?' });
                
                await sock.sendMessage(from, { text: 'Bentar, AI lagi mikir...' });
                const res = await axios.get(`https://widipe.com/gemini?text=${encodeURIComponent(text)}`);
                await sock.sendMessage(from, { text: `*🤖 AI JAWAB:*\n\n${res.data.result}` });
            }

            // Fitur tes ping
            if (body === 'ping') {
                await sock.sendMessage(from, { text: 'PONG! Bot aktif Mas Naffdz!' });
            }

        } catch (e) {
            console.log("Error baca pesan: " + e);
        }
    });
}
startBot();
