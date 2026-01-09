const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot Online');
}).listen(process.env.PORT || 8000)

const http = require('http');
const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');

// 1. SERVER PANCINGAN BIAR KOYEB TIDAK MATI
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

  sock.ev.on('messages.upsert', async (chat) => {
    try {
      const m = chat.messages[0];
      if (!m.message || m.key.fromMe) return;

      const remoteJid = m.key.remoteJid;
      const content = JSON.stringify(m.message);
      const from = m.key.remoteJid;
      const type = Object.keys(m.message)[0];
      const body = (type === 'conversation') ? m.message.conversation : (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : (type === 'imageMessage') ? m.message.imageMessage.caption : '';
      
      const prefix = '!';
      const isCmd = body.startsWith(prefix);
      const command = isCmd ? body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : '';
      const args = body.trim().split(/ +/).slice(1);
      const text = args.join(' ');

      // LOGIKA ADMIN & GRUP
      const isGroup = from.endsWith('@g.us');
      const groupMetadata = isGroup ? await sock.groupMetadata(from) : '';
      const participants = isGroup ? groupMetadata.participants : [];
      const groupAdmins = isGroup ? participants.filter(v => v.admin !== null).map(v => v.id) : [];
      const isAdmins = isGroup ? groupAdmins.includes(m.key.participant) : false;

      const reply = (teks) => {
        sock.sendMessage(from, { text: teks }, { quoted: m });
      };

      if (isCmd) {
        // FITUR ANTI SPAM / ADMIN ONLY
        if (isGroup && !isAdmins) return reply('❌ Maaf, hanya Admin yang bisa perintah Bot.');

        switch (command) {
          case 'menu':
            const menuTeks = `*── 「 BOT WHATSAPP BY NAFFDZ 」 ──*

🤖 *AI:*
- !ai [pertanyaan] (Gemini AI)

🎨 *STIKER:*
- !s (balas gambar dengan caption !s)
- !tts [teks] (buat stiker dari tulisan)

📢 *GRUP:*
- !all [pesan] (Tag semua member)

📥 *DOWNLOAD:*
- !tiktok [link]
- !mp3 [link youtube]
- !mp4 [link youtube]
- !ig [link instagram]

_Powered by Naffdz_`;
            reply(menuTeks);
            break;

          case 'all':
            if (!isGroup) return reply('Hanya bisa di grup!');
            let tagAll = `*Tag All by Naffdz*\n\n${text ? text : ''}\n\n`;
            for (let mem of participants) {
              tagAll += `@${mem.id.split('@')[0]}\n`;
            }
            sock.sendMessage(from, { text: tagAll, mentions: participants.map(a => a.id) });
            break;

          case 'ai':
            if (!text) return reply('Mau tanya apa ke Gemini?');
            try {
              let res = await axios.get(`https://widipe.com/gemini?text=${encodeURIComponent(text)}`);
              reply(res.data.result);
            } catch (e) {
              reply('Gemini lagi error, coba lagi nanti.');
            }
            break;

          case 's':
            if (type === 'imageMessage' || (m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage)) {
              reply('Sabar, stiker lagi dibuat...');
              // Proses stiker butuh ffmpeg di Aptfile
            } else {
              reply('Kirim/balas gambar dengan caption !s');
            }
            break;

          case 'tiktok':
          case 'ig':
            if (!text) return reply('Mana linknya?');
            reply('Sabar ya, video lagi didownload...');
            try {
                let res = await axios.get(`https://widipe.com/download/tiktok?url=${text}`);
                await sock.sendMessage(from, { video: { url: res.data.result.play }, caption: 'Done by Naffdz' });
            } catch (e) { reply('Gagal download, link mungkin mati.'); }
            break;

          case 'mp3':
            if (!text) return reply('Mana link YouTube-nya?');
            reply('Proses download audio...');
            try {
                let res = await axios.get(`https://widipe.com/download/ytdl?url=${text}`);
                await sock.sendMessage(from, { audio: { url: res.data.result.mp3 }, mimetype: 'audio/mp4' });
            } catch (e) { reply('Gagal ambil audio.'); }
            break;
        }
      }
    } catch (err) {
      console.log(err);
    }
  });
}

startBot();
        
