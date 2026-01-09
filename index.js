const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const http = require('http');
const axios = require('axios');

http.createServer((req, res) => { res.write('Bot Aktif'); res.end(); }).listen(process.env.PORT || 8000);

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesi_wa');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ["Naffdz Bot", "Chrome", "1.0.0"],
        syncFullHistory: false // BIAR GAK LAMA SYNC-NYA
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ BOT NAFFDZ GACOR SIAP PAKAI!');
        }
    });

    sock.ev.on('messages.upsert', async (chat) => {
        try {
            const m = chat.messages[0];
            if (!m.message || m.key.fromMe) return;
            
            const from = m.key.remoteJid;
            const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || "";

            if (body.startsWith('!ai')) {
                const text = body.slice(4);
                if (!text) return sock.sendMessage(from, { text: 'Tanya apa Mas?' });
                const res = await axios.get(`https://widipe.com/gemini?text=${encodeURIComponent(text)}`);
                await sock.sendMessage(from, { text: `*🤖 AI:* ${res.data.result}` });
            }
            
            if (body === 'ping') await sock.sendMessage(from, { text: 'PONG! Gacor Mas!' });

        } catch (e) { console.log("Skip error..."); }
    });
}
startBot();
