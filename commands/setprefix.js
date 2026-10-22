const fs = require("fs");
const path = require("path");

module.exports = async (sock, m, args) => {
    const from = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    const settings = require("../settings");

    const BRAND = "𒁂【 𝘼𝘾𝙎 𝙏𝙊𝙉𝙈𝙊𝙔 】𒁂";

    // Verify Owner
    const ownerNumber = String(settings.ownerNumber || "").replace(/[^0-9]/g, "");
    const senderNumber = sender.split("@")[0].replace(/[^0-9]/g, "");
    const isOwner = senderNumber === ownerNumber || m.key.fromMe;

    if (!isOwner) {
        return await sock.sendMessage(from, {
            text: `╭━━━〔 ${BRAND} 〕━━━⬣
┃ ❌ *ACCESS DENIED*
┃
┃ 👑 Only the Bot Owner can use this command.
╰━━━━━━━━━━━━━━━━━━━━⬣`
        }, { quoted: m });
    }

    // Check new prefix
    if (!args[0]) {
        const errorText = `╭━━━〔 ${BRAND} 〕━━━⬣
┃ ❌ *INVALID USAGE*
┃
┃ Missing new prefix!
┃
┃ 📌 *Usage:* ${settings.prefix}setprefix [new_prefix]
┃ 💡 *Example:* ${settings.prefix}setprefix !
╰━━━━━━━━━━━━━━━━━━━━⬣`.trim();

        return await sock.sendMessage(from, {
            text: errorText
        }, { quoted: m });
    }

    const newPrefix = args[0];

    // Validate prefix
    if (newPrefix.length > 5 || /\s/.test(newPrefix)) {
        return await sock.sendMessage(from, {
            text: `╭━━━〔 ${BRAND} 〕━━━⬣
┃ ❌ *INVALID PREFIX*
┃
┃ Use 1–5 characters without spaces.
╰━━━━━━━━━━━━━━━━━━━━⬣`
        }, { quoted: m });
    }

    try {
        const settingsPath = path.join(__dirname, "../settings.js");
        let settingsContent = fs.readFileSync(settingsPath, "utf-8");

        const prefixRegex = /(\bprefix\s*:\s*)(["'`])([^"'`]*)\2/;

        if (!prefixRegex.test(settingsContent)) {
            throw new Error("Prefix setting not found in settings.js");
        }

        settingsContent = settingsContent.replace(
            prefixRegex,
            (_, before, quote) => `${before}"${newPrefix}"`
        );

        fs.writeFileSync(settingsPath, settingsContent, "utf-8");

        const successText = `╭━━━〔 ${BRAND} 〕━━━⬣
┃ ✅ *PREFIX UPDATED*
┃
┃ 👑 *Owner:* ACS TONMOY
┃ ⚡ *New Prefix:* ${newPrefix}
┃ 🔄 *Status:* Restarting...
╰━━━━━━━━━━━━━━━━━━━━⬣`.trim();

        await sock.sendMessage(from, {
            text: successText
        }, { quoted: m });

        setTimeout(() => {
            process.exit(0);
        }, 1500);

    } catch (e) {
        console.error("SetPrefix Error:", e);

        await sock.sendMessage(from, {
            text: `╭━━━〔 ${BRAND} 〕━━━⬣
┃ ❌ *UPDATE FAILED*
┃
┃ Could not update settings.js.
┃ Check file permissions and prefix format.
╰━━━━━━━━━━━━━━━━━━━━⬣`
        }, { quoted: m });
    }
};
