const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const http = require('http');

// SERVER BIAR TETAP HIDUP
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot Naffdz Gacor Online');
}).listen(process.env.PORT || 8000);

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('sesi_wa');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ["Naffdz Gacor", "Chrome", "1.0.0"]
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, qr } = update;
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === 'open') console.log('✅ BOT NAFFDZ GACOR TERHUBUNG!');
    if (connection === 'close') startBot();
  });

  sock.ev.on('messages.upsert', async (chat) => {
    try {
      const m = chat.messages[0];
      if (!m.message || m.key.fromMe) return;
      const from = m.key.remoteJid;
      const type = Object.keys(m.message)[0];
      const body = (type === 'conversation') ? m.message.conversation : (type === 'imageMessage') ? m.message.imageMessage.caption : (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : '';
      const text = body.slice(body.indexOf(' ') + 1);
      const reply = (teks) => sock.sendMessage(from, { text: teks }, { quoted: m });

      // --- FITUR AI GEMINI ---
      if (body.startsWith('!ai')) {
        if (!text) return reply('Mau tanya apa?');
        const res = await axios.get(`https://widipe.com/gemini?text=${encodeURIComponent(text)}`);
        reply(`*🤖 AI GACOR:*\n\n${res.data.result}`);
      }

      // --- FITUR STIKER PRO ---
      if (body.startsWith('!s')) {
        const isQuotedImage = type === 'extendedTextMessage' && m.message.extendedTextMessage.contextInfo?.quotedMessage?.imageMessage;
        if (type === 'imageMessage' || isQuotedImage) {
          reply('🎨 Sedang memoles stiker pro...');
          const stream = await downloadMediaMessage(m, 'buffer', {});
          fs.writeFileSync('temp.jpg', stream);
          exec(`ffmpeg -i temp.jpg -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=increase,fps=15,crop=512:512" temp.webp`, (err) => {
            if (err) return reply('Gagal! Klik Trigger Build dulu.');
            sock.sendMessage(from, { sticker: fs.readFileSync('temp.webp') });
            fs.unlinkSync('temp.jpg'); fs.unlinkSync('temp.webp');
          });
        }
      }

      // --- FITUR STIKER TULISAN ---
      if (body.startsWith('!tts')) {
        if (!text) return reply('Ketik teksnya!');
        const res = await axios({ method: 'get', url: `https://api.lolhuman.xyz/api/memegen?apikey=Gataubibi&text=${encodeURIComponent(text)}`, responseType: 'arraybuffer' });
        fs.writeFileSync('tts.jpg', res.data);
        exec(`ffmpeg -i tts.jpg -vcodec libwebp -vf "scale=512:512" tts.webp`, (err) => {
          sock.sendMessage(from, { sticker: fs.readFileSync('tts.webp') });
        });
      }

    } catch (e) { console.log("Error: " + e); }
  });
}
startBot();
