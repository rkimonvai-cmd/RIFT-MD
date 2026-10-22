const settings = require("../settings");
const fs = require("fs");
const path = require("path");

module.exports = async (sock, m, args) => {
    const pushName =
        m.pushName ||
        m.senderPn ||
        (m.sender ? m.sender.split("@")[0] : "User");

    const chatId = m.key.remoteJid;
    const prefix = settings.prefix || ".";

    function runtime(seconds) {
        seconds = Number(seconds);

        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const min = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        return `${d ? d + "ᴅ " : ""}${h ? h + "ʜ " : ""}${min ? min + "ᴍ " : ""}${s}ѕ`;
    }

    const uptime = runtime(process.uptime());

    let commandList = [];

    try {
        const commandsDir = path.join(__dirname, "../commands");

        if (fs.existsSync(commandsDir)) {
            commandList = fs.readdirSync(commandsDir)
                .filter(file => file.endsWith(".js"))
                .map(file => file.replace(/\.js$/i, "").toLowerCase());
        }
    } catch (e) {
        console.error("Menu command scan error:", e);
    }

    const totalCommands = commandList.length;

    const categories = {
        "🤖 𝐁𝐎𝐓 𝐈𝐍𝐅𝐎": [
            "alive", "ping", "menu", "owner", "runtime",
            "gstatut", "jidnewsletter", "fb", "repo"
        ],
        "🛠️ 𝐓𝐎𝐎𝐋𝐒": [
            "play", "igdl", "twitter", "clear",
            "tourl", "video", "vv", "image"
        ],
        "👥 𝐆𝐑𝐎𝐔𝐏 𝐂𝐎𝐍𝐓𝐑𝐎𝐋": [
            "kick", "kickall", "add", "promote", "demote",
            "delete", "tagall", "open", "close", "link", "hidetag"
        ],
        "⚙️ 𝐒𝐄𝐓𝐓𝐈𝐍𝐆𝐒": [
            "antilink", "setprefix", "help", "mode",
            "autoreact", "autoread", "autotyping"
        ]
    };

    const categorizedCommands = new Set(
        Object.values(categories).flat()
    );

    const otherCommands = commandList.filter(
        cmd => !categorizedCommands.has(cmd)
    );

    if (otherCommands.length > 0) {
        categories["✨ 𝐌𝐎𝐑𝐄 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒"] = otherCommands;
    }

    let menuCategoriesText = "";

    for (const [catName, cmds] of Object.entries(categories)) {
        const activeCmds = cmds.filter(
            cmd => commandList.includes(cmd)
        );

        if (activeCmds.length === 0) continue;

        const formattedCmds = activeCmds
            .map(cmd => `┃  ⬡  ${prefix}${cmd}`)
            .join("\n");

        menuCategoriesText += `
╭━━━〔 ${catName} 〕
${formattedCmds}
╰━━━━━━━━━━━━━━━━━━⬣
`;
    }

    try {
        const menu = `
╭━━━〔 ☠︎︎ 𝐀 𝐂 𝐒 ☠︎︎ 𝐓 𝐎 𝐍 𝐌 𝐎 𝐘 シ︎ 〕
┃
┃ 👑 𝐎𝐖𝐍𝐄𝐑 : 𝐀𝐂𝐒 𝐓𝐎𝐍𝐌𝐎𝐘
┃ 👤 𝐔𝐒𝐄𝐑 : ${pushName}
┃ 📚 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 : ${totalCommands}
┃ ⏱️ 𝐔𝐏𝐓𝐈𝐌𝐄 : ${uptime}
┃ ⚡ 𝐏𝐑𝐄𝐅𝐈𝐗 : ${prefix}
┃ 🌐 𝐌𝐎𝐃𝐄 : 𝐏𝐔𝐁𝐋𝐈𝐂
┃ 🏷️ 𝐕𝐄𝐑𝐒𝐈𝐎𝐍 : 𝟐.𝟎.𝟎
╰━━━━━━━━━━━━━━━━━━⬣

${menuCategoriesText}

╭━━〔 𝐀𝐂𝐒 𝐂𝐘𝐁𝐄𝐑 〕
┃ ✦ 𝐒𝐭𝐲𝐥𝐞 • 𝐏𝐨𝐰𝐞𝐫 • 𝐏𝐞𝐫𝐟𝐨𝐫𝐦𝐚𝐧𝐜𝐞
╰━━━━━━━━━━━━━━━━━━⬣

> © 𝟐𝟎𝟐𝟔 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐀𝐂𝐒 𝐓𝐎𝐍𝐌𝐎𝐘
        `.trim();

        await sock.sendMessage(chatId, {
            image: {
                url: "https://files.catbox.moe/f5wxz5.jpg"
            },
            caption: menu,
            contextInfo: {
                mentionedJid: [
                    m.sender || m.key.participant
                ].filter(Boolean),
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363407561123100@newsletter",
                    newsletterName: "𝐀𝐂𝐒 𝐓𝐎𝐍𝐌𝐎𝐘 𝐎𝐅𝐅𝐈𝐂𝐈𝐀𝐋",
                    serverMessageId: -1
                }
            }
        }, { quoted: m });

    } catch (e) {
        console.error("Menu Error:", e);

        await sock.sendMessage(chatId, {
            text: "❌ 𝐌𝐄𝐍𝐔 𝐄𝐑𝐑𝐎𝐑\n\n> Please try again later."
        }, { quoted: m });
    }
};
