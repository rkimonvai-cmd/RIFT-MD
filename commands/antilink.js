
const fs = require("fs");
const path = require("path");

const BOT_NAME = "☠︎︎ 𝐀 𝐂 𝐒 ☠︎︎ 𝐓 𝐎 𝐍 𝐌 𝐎 𝐘 シ︎";

module.exports = async (sock, m, args) => {
    const from = m.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const sender = m.key.participant || m.key.remoteJid;
    const settings = require("../settings");

    const ownerNumber = String(settings.ownerNumber || "")
        .replace(/[^0-9]/g, "");

    const senderNumber = sender.split("@")[0].split(":")[0];
    const isOwner = senderNumber === ownerNumber || m.key.fromMe;

    const reply = async (text) => {
        return sock.sendMessage(from, { text }, { quoted: m });
    };

    if (!isGroup) {
        return reply(
            "╭━━━〔 ⚠️ ACCESS DENIED 〕━━━╮\n" +
            "┃\n" +
            "┃  ✦ This command works in groups only.\n" +
            "┃  ✦ Open a group and try again.\n" +
            "┃\n" +
            "╰━━━━━━━━━━━━━━━━━━━━╯"
        );
    }

    if (!isOwner) {
        return reply(
            "╭━━━〔 🔐 RESTRICTED ACCESS 〕━━━╮\n" +
            "┃\n" +
            "┃  ❌ Owner authorization required.\n" +
            "┃  👑 This command is owner-only.\n" +
            "┃\n" +
            "╰━━━━━━━━━━━━━━━━━━━━╯"
        );
    }

    const dbPath = path.join(__dirname, "../database.json");

    let db = {
        antilink: [],
        antilinkMode: {}
    };

    try {
        if (fs.existsSync(dbPath)) {
            const saved = JSON.parse(fs.readFileSync(dbPath, "utf8"));
            db = { ...db, ...saved };

            if (!Array.isArray(db.antilink)) db.antilink = [];
            if (!db.antilinkMode || typeof db.antilinkMode !== "object") {
                db.antilinkMode = {};
            }
        }
    } catch (error) {
        console.error("AntiLink Database Error:", error.message);
        return reply("❌ Database error. Please check database.json.");
    }

    const action = String(args[0] || "").toLowerCase();

    if (!action) {
        return reply(
            "╭━━━〔 🛡️ 𝐀𝐍𝐓𝐈𝐋𝐈𝐍𝐊 𝐂𝐎𝐍𝐓𝐑𝐎𝐋 〕━━━╮\n" +
            "┃\n" +
            "┃  👑 𝐎𝐖𝐍𝐄𝐑 𝐏𝐀𝐍𝐄𝐋\n" +
            "┃  ━━━━━━━━━━━━━━━━━━\n" +
            "┃  🟢 .antilink on\n" +
            "┃  └─ Warning Mode: 3 warnings\n" +
            "┃\n" +
            "┃  🔴 .antilink kick\n" +
            "┃  └─ Instant removal mode\n" +
            "┃\n" +
            "┃  ⚪ .antilink off\n" +
            "┃  └─ Disable AntiLink\n" +
            "┃\n" +
            "┃  🤖 𝐁𝐎𝐓: " + BOT_NAME + "\n" +
            "╰━━━━━━━━━━━━━━━━━━━━━━╯"
        );
    }

    if (action === "on" || action === "warn") {
        if (!db.antilink.includes(from)) {
            db.antilink.push(from);
        }

        db.antilinkMode[from] = "warn";
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

        return reply(
            "╭━━━〔 🛡️ 𝐒𝐄𝐂𝐔𝐑𝐈𝐓𝐘 𝐀𝐂𝐓𝐈𝐕𝐄 〕━━━╮\n" +
            "┃\n" +
            "┃  ✅ AntiLink protection enabled\n" +
            "┃  ⚡ Mode: Warning System\n" +
            "┃  🔢 Limit: 3 warnings\n" +
            "┃  🔒 Action: Kick after 3 warnings\n" +
            "┃\n" +
            "┃  👑 Authorized by Owner\n" +
            "┃  🤖 " + BOT_NAME + "\n" +
            "╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
            "✦ Group link protection is now enabled."
        );
    }

    if (action === "kick") {
        if (!db.antilink.includes(from)) {
            db.antilink.push(from);
        }

        db.antilinkMode[from] = "kick";
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

        return reply(
            "╭━━━〔 ⚔️ 𝐊𝐈𝐂𝐊 𝐌𝐎𝐃𝐄 〕━━━╮\n" +
            "┃\n" +
            "┃  ✅ AntiLink is enabled\n" +
            "┃  ⚡ Mode: Instant Kick\n" +
            "┃  🚫 Unauthorized links are prohibited\n" +
            "┃\n" +
            "┃  👑 Owner Control: Verified\n" +
            "┃  🤖 " + BOT_NAME + "\n" +
            "╰━━━━━━━━━━━━━━━━━━━━╯\n\n" +
            "✦ The bot needs group-admin permission to remove members."
        );
    }

    if (action === "off") {
        db.antilink = db.antilink.filter(id => id !== from);
        delete db.antilinkMode[from];

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

        return reply(
            "╭━━━〔 🔓 𝐏𝐑𝐎𝐓𝐄𝐂𝐓𝐈𝐎𝐍 𝐎𝐅𝐅 〕━━━╮\n" +
            "┃\n" +
            "┃  ✅ AntiLink has been disabled\n" +
            "┃  ⚪ Mode: Inactive\n" +
            "┃  🔓 Group link filter: Off\n" +
            "┃\n" +
            "┃  👑 Owner Control: Verified\n" +
            "┃  🤖 " + BOT_NAME + "\n" +
            "╰━━━━━━━━━━━━━━━━━━━━━━╯"
        );
    }

    return reply(
        "╭━━━〔 ❌ INVALID COMMAND 〕━━━╮\n" +
        "┃\n" +
        "┃  Try one of these commands:\n" +
        "┃  ➤ .antilink on\n" +
        "┃  ➤ .antilink kick\n" +
        "┃  ➤ .antilink off\n" +
        "┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━╯"
    );
};
