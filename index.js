const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const http = require('http');

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot Naffdz Gacor Online');
}).listen(process.env.PORT || 8000);

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('sesi_wa');
  const sock = makeWASocket({ auth: state, printQRInTerminal: true });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (chat) => {
    try {
      const m = chat.messages[0];
      if (!m.message || m.key.fromMe) return;
      const from = m.key.remoteJid;
      const type = Object.keys(m.message)[0];
      const body = (type === 'conversation') ? m.message.conversation : (type === 'imageMessage') ? m.message.imageMessage.caption : (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : '';
      const text = body.slice(body.indexOf(' ') + 1);
      const reply = (teks) => sock.sendMessage(from, { text: teks }, { quoted: m });

      // --- FITUR STIKER TULISAN (PRO) ---
      if (body.startsWith('!tts')) {
        if (!text || body === '!tts') return reply('Contoh: !tts Naffdz Ganteng');
        reply('📝 Sedang merangkai kata jadi stiker...');
        const ttsUrl = `https://api.lolhuman.xyz/api/memegen?apikey=Gataubibi&text=${encodeURIComponent(text)}`;
        
        const res = await axios({ method: 'get', url: ttsUrl, responseType: 'arraybuffer' });
        fs.writeFileSync('tts.jpg', res.data);
        exec(`ffmpeg -i tts.jpg -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=increase,fps=15,crop=512:512" tts.webp`, (err) => {
          if (err) return reply('Gagal! Coba lagi nanti.');
          sock.sendMessage(from, { sticker: fs.readFileSync('tts.webp') });
          fs.unlinkSync('tts.jpg'); fs.unlinkSync('tts.webp');
        });
      }

      // --- FITUR STIKER GAMBAR (PRO) ---
      if (body.startsWith('!s')) {
        const isQuotedImage = type === 'extendedTextMessage' && m.message.extendedTextMessage.contextInfo?.quotedMessage?.imageMessage;
        if (type === 'imageMessage' || isQuotedImage) {
          reply('🎨 Otw jadi stiker pro...');
          const stream = await downloadMediaMessage(m, 'buffer', {});
          fs.writeFileSync('temp.jpg', stream);
          exec(`ffmpeg -i temp.jpg -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=increase,fps=15,crop=512:512" temp.webp`, (err) => {
            if (err) return reply('Gagal! Klik TRIGGER BUILD di Koyeb.');
            sock.sendMessage(from, { sticker: fs.readFileSync('temp.webp') });
          });
        }
      }

      // --- FITUR AI GACOR ---
      if (body.startsWith('!ai')) {
        const res = await axios.get(`https://widipe.com/gemini?text=${encodeURIComponent(text)}`);
        reply(res.data.result);
      }

    } catch (e) { console.log(e); }
  });
}
startBot();
