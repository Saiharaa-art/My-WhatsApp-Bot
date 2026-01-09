const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const axios = require('axios');
const http = require('http');
const qrcode = require('qrcode-terminal');

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
    else if (connection === 'open') console.log('✅ BOT NAFFDZ SUDAH SIAP!');
  });

  sock.ev.on('messages.upsert', async (chat) => {
    try {
      const m = chat.messages[0];
      if (!m.message || m.key.fromMe) return;
      const from = m.key.remoteJid;
      const type = Object.keys(m.message)[0];
      const body = (type === 'conversation') ? m.message.conversation : (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : (type === 'imageMessage') ? m.message.imageMessage.caption : '';
      
      const reply = (teks) => sock.sendMessage(from, { text: teks }, { quoted: m });

      if (body.startsWith('!menu')) {
        reply(`*── 「 BOT BY NAFFDZ 」 ──*\n\n🤖 *AI:* !ai [tanya]\n🎨 *STIKER:* !s (balas foto)\n📢 *TAG ALL:* !all\n\n_Bot by Naffdz_`);
      }

      if (body.startsWith('!ai')) {
        const text = body.slice(4);
        if (!text) return reply('Tanya apa?');
        try {
          const res = await axios.get(`https://widipe.com/gemini?text=${encodeURIComponent(text)}`);
          reply(res.data.result);
        } catch (e) { reply('Server AI lagi sibuk, coba lagi nanti!'); }
      }

      if (body.startsWith('!all')) {
        const groupMetadata = await sock.groupMetadata(from);
        const participants = groupMetadata.participants;
        let teksTag = `*📢 TAG ALL BY NAFFDZ*\n\n`;
        for (let mem of participants) teksTag += `@${mem.id.split('@')[0]}\n`;
        sock.sendMessage(from, { text: teksTag, mentions: participants.map(a => a.id) });
      }
    } catch (err) { console.log(err); }
  });
}
startBot();
