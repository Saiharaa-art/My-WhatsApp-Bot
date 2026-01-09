const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const http = require('http');

// SERVER PANCINGAN
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot WhatsApp by Naffdz is Online');
}).listen(process.env.PORT || 8000);

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('sesi_wa');
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
    browser: ["Bot WhatsApp by Naffdz", "Safari", "1.0.0"]
  });

  sock.ev.on('creds.update', saveCreds);

  // PENANGAN QR CODE & KONEKSI
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('SCAN QR INI:');
      require('qrcode-terminal').generate(qr, { small: true });
    }
    if (connection === 'close') startBot();
    else if (connection === 'open') console.log('✅ BERHASIL TERHUBUNG!');
  });

  sock.ev.on('messages.upsert', async (chat) => {
    try {
      const m = chat.messages[0];
      if (!m.message || m.key.fromMe) return;

      const from = m.key.remoteJid;
      const type = Object.keys(m.message)[0];
      const body = (type === 'conversation') ? m.message.conversation : (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : (type === 'imageMessage') ? m.message.imageMessage.caption : '';
      const prefix = '!';
      const isCmd = body.startsWith(prefix);
      const command = isCmd ? body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : '';
      const args = body.trim().split(/ +/).slice(1);
      const text = args.join(' ');

      const reply = (teks) => {
        sock.sendMessage(from, { text: teks }, { quoted: m });
      };

      if (isCmd) {
        switch (command) {
          case 'menu':
            reply(`*── 「 BOT BY NAFFDZ 」 ──*\n\n🤖 *AI:* !ai [tanya]\n🎨 *STIKER:* !s (balas foto)\n📢 *GRUP:* !all [teks]\n📥 *DL:* !tiktok, !mp3, !mp4\n\n_Powered by Naffdz_`);
            break;

          case 'ai':
            if (!text) return reply('Mau tanya apa ke Gemini?');
            try {
              // API Gemini Cadangan yang lebih stabil
              let res = await axios.get(`https://api.lolhuman.xyz/api/gemini?apikey=Gataubibi&text=${encodeURIComponent(text)}`);
              reply(res.data.result);
            } catch (e) {
              reply('Aduh, Gemini lagi pusing. Coba lagi ya!');
            }
            break;

          case 'all':
            if (!from.endsWith('@g.us')) return reply('Cuma bisa di grup!');
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants;
            let teksTag = `*Tag All by Naffdz*\n\n${text}\n\n`;
            for (let mem of participants) teksTag += `@${mem.id.split('@')[0]}\n`;
            sock.sendMessage(from, { text: teksTag, mentions: participants.map(a => a.id) });
            break;

          case 's':
            reply('Fitur stiker butuh FFmpeg, pastikan Aptfile sudah ada!');
            // Logika stiker di sini
            break;
        }
      }
    } catch (err) { console.log(err); }
  });
}

startBot();
