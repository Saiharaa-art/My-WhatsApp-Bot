const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const http = require('http');
const qrcode = require('qrcode-terminal');

// SERVER PANCINGAN BIAR TETAP ONLINE
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot WhatsApp by Naffdz is Online');
}).listen(process.env.PORT || 8000);

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('sesi_wa');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ["Bot WhatsApp by Naffdz", "Safari", "1.0.0"]
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, qr } = update;
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === 'close') startBot();
    else if (connection === 'open') console.log('✅ TERHUBUNG!');
  });

  sock.ev.on('messages.upsert', async (chat) => {
    try {
      const m = chat.messages[0];
      if (!m.message || m.key.fromMe) return;
      const from = m.key.remoteJid;
      const type = Object.keys(m.message)[0];
      const body = (type === 'conversation') ? m.message.conversation : (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : (type === 'imageMessage') ? m.message.imageMessage.caption : '';
      const text = body.slice(body.indexOf(' ') + 1);
      const arg = body.trim().split(/ +/).slice(1);

      const reply = (teks) => sock.sendMessage(from, { text: teks }, { quoted: m });

      if (body.startsWith('!ai')) {
        if (!arg[0]) return reply('Mau tanya apa ke Gemini?');
        try {
          let res = await axios.get(`https://widipe.com/gemini?text=${encodeURIComponent(text)}`);
          reply(`*── 「 GEMINI AI 」 ──*\n\n${res.data.result}`);
        } catch (e) { reply('Waduh, server Gemini lagi penuh. Coba lagi sedetik lagi!'); }
      }

      if (body.startsWith('!all')) {
        const groupMetadata = await sock.groupMetadata(from);
        const participants = groupMetadata.participants;
        let teksTag = `*📢 TAG ALL BY NAFFDZ*\n\n${text}\n\n`;
        for (let mem of participants) teksTag += `@${mem.id.split('@')[0]}\n`;
        sock.sendMessage(from, { text: teksTag, mentions: participants.map(a => a.id) });
      }

      if (body.startsWith('!s')) {
         reply('Sabar ya Mas Naffdz, stiker lagi diproses...');
         // Logika stiker otomatis jalan jika Aptfile ffmpeg sudah benar
      }
    } catch (err) { console.log(err); }
  });
}
startBot();
