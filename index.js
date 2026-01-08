const http = require('http');
http.createServer((req, res) => res.end('Bot Online')).listen(process.env.PORT || 8000);

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesi_wa');
    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        logger: require('pino')({ level: 'silent' }),
        browser: ["Bot Multi-Fitur", "Safari", "1.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) qrcode.generate(qr, { small: true });
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ BOT BERHASIL TERHUBUNG!');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const type = Object.keys(msg.message)[0];
        const isGroup = from.endsWith('@g.us');
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";

        // 1. AUTO READ (Centang Biru)
        await sock.readMessages([msg.key]);

        // 2. AUTO JAWAB (Sederhana)
        if (text.toLowerCase() === 'halo') {
            await sock.sendMessage(from, { text: 'Halo juga! Ketik !menu untuk fitur.' });
        }

        // --- FITUR COMMAND ---
        if (text.startsWith('!')) {
            const command = text.slice(1).trim().split(/ +/).shift().toLowerCase();
            const args = text.trim().split(/ +/).slice(1);
            const q = args.join(' ');

            switch (command) {
                case 'menu':
                    const menu = `*── 「 MENU BOT 」 ──*
                    
🤖 *AI:* !ai [pertanyaan]
🎨 *Stiker:* !s (reply/caption gambar)
📢 *Grup:* !tagall [pesan]
📥 *Download:*
   • !tiktok [link]
   • !ytmp3 [link]
   • !ig [link]`;
                    await sock.sendMessage(from, { text: menu });
                    break;

                case 'ai':
                    if (!q) return sock.sendMessage(from, { text: 'Mau tanya apa ke AI?' });
                    try {
                        const res = await axios.get(`https://aivanz.vercel.app/api/gpt?q=${encodeURIComponent(q)}`);
                        await sock.sendMessage(from, { text: `*🤖 AI:* ${res.data.result}` });
                    } catch (e) { sock.sendMessage(from, { text: 'Fitur AI sedang error.' }); }
                    break;

                case 's':
                case 'stiker':
                    const isMedia = type === 'imageMessage' || (type === 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo?.quotedMessage?.imageMessage);
                    if (isMedia) {
                        const mediaData = type === 'imageMessage' ? msg.message.imageMessage : msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
                        const stream = await downloadContentFromMessage(mediaData, 'image');
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
                        
                        const input = `./${Date.now()}.jpg`;
                        const output = `./${Date.now()}.webp`;
                        fs.writeFileSync(input, buffer);
                        exec(`ffmpeg -i ${input} -vcodec libwebp -filter:v "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" ${output}`, async (err) => {
                            if (!err) {
                                await sock.sendMessage(from, { sticker: fs.readFileSync(output) });
                            }
                            if (fs.existsSync(input)) fs.unlinkSync(input);
                            if (fs.existsSync(output)) fs.unlinkSync(output);
                        });
                    } else { sock.sendMessage(from, { text: 'Kirim/reply gambar dengan caption !s' }); }
                    break;

                case 'tagall':
                    if (!isGroup) return;
                    const group = await sock.groupMetadata(from);
                    const members = group.participants.map(v => v.id);
                    let pesan = `*📢 TAG ALL*\n\nPesan: ${q || 'Tidak ada'}\n\n`;
                    for (let mem of members) { pesan += ` @${mem.split('@')[0]}`; }
                    await sock.sendMessage(from, { text: pesan, mentions: members });
                    break;

                case 'tiktok':
                    if (!q) return sock.sendMessage(from, { text: 'Masukkan link TikTok!' });
                    try {
                        const ttres = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${q}`);
                        await sock.sendMessage(from, { video: { url: ttres.data.video.noWatermark }, caption: 'Sukses!' });
                    } catch (e) { sock.sendMessage(from, { text: 'Gagal download TikTok.' }); }
                    break;
                
                case 'ytmp3':
                    sock.sendMessage(from, { text: 'Sedang memproses audio...' });
                    // API downloader bersifat dinamis, jika satu mati cari API lain
                    try {
                        const ytres = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${q}`);
                        await sock.sendMessage(from, { audio: { url: ytres.data.result.download }, mimetype: 'audio/mp4' });
                    } catch (e) { sock.sendMessage(from, { text: 'Gagal download YouTube Audio.' }); }
                    break;
            }
        }
    });
}

startBot();

