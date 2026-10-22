module.exports = async (sock, m) => {
    const { remoteJid, sender } = m.key;

    const message = `╭━━━〔 *COMMAND NOT FOUND* 〕━━━⬣
┃ 👋 Hello @${sender.split('@')[0]}!
┃
┃ ⚠️ Unknown command detected!
┃ 📜 Type: .menu
┃ 🤖 Bot: ☠︎︎ 𝐀 𝐂 𝐒 ☠︎︎ 𝐓 𝐎 𝐍 𝐌 𝐎 𝐘 シ︎
╰━━━━━━━━━━━━━━━━━━━━⬣

> _Reply with .menu to explore all features._ 💜`;

    await sock.sendMessage(
        remoteJid,
        {
            video: {
                url: "https://files.catbox.moe/c6lsaf.mp4"
            },
            caption: message,
            mentions: [sender],
            gifPlayback: false
        },
        { quoted: m }
    );
};
