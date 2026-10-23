async function startBot() {
    const authDir = process.env.SESSION_PATH || path.join(__dirname, "session");
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        printQRInTerminal: false,
        markOnlineOnConnect: false
    });

    // ==================================================
    // PAIRING CODE
    // ==================================================

    if (!sock.authState.creds.registered) {
        const ownerPhone = getNumber(settings.ownerNumber);

        if (!ownerPhone) {
            console.error("❌ Add your WhatsApp number to settings.js.");
        } else {
            console.log(`🔄 Requesting pairing code for ${ownerPhone}...`);

            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(ownerPhone);
                    console.log(`\n✅ YOUR PAIRING CODE: ${code}\n`);
                    console.log("Enter this code in WhatsApp Linked Devices.");
                } catch (error) {
                    console.error("❌ Pairing Error:", error.message);
                }
            }, 5000);
        }
    }

    sock.ev.on("creds.update", saveCreds);

    // ==================================================
    // AUTO STATUS VIEW + REACTION
    // ==================================================

    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const m = messages?.[0];

            if (!m?.message || m.key.remoteJid !== "status@broadcast") {
                return;
            }

            const participant = m.key.participant || m.participant;
            if (!participant) return;

            await sock.readMessages([m.key]);

            const emojis = ["💚", "🔥", "✨", "🙌", "💯", "👑", "🚀", "😍", "⚡", "💎"];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

            await sock.sendMessage(
                "status@broadcast",
                { react: { text: randomEmoji, key: m.key } },
                { statusJidList: [participant] }
            );
        } catch (error) {
            console.error("Auto Status Error:", error.message);
        }
    });

    // ==================================================
    // CONNECTION UPDATE
    // ==================================================

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;

            if (statusCode === DisconnectReason.loggedOut) {
                console.error("❌ WhatsApp logged out. Remove the old session and pair again.");
            } else {
                console.log("🔄 Connection closed. Reconnecting...");
                setTimeout(() => {
                    startBot().catch(err => console.error("Reconnect Error:", err));
                }, 3000);
            }
        }

        if (connection === "open") {
            console.log(`\n🎊 ${BOT_NAME} IS CONNECTED!\n`);

            const ownerNumber = getNumber(settings.ownerNumber);
            if (!ownerNumber) return;

            const ownerJid = `${ownerNumber}@s.whatsapp.net`;

            try {
                await sock.sendMessage(ownerJid, {
                    image: { url: "https://files.catbox.moe/vv674d.jpg" },
                    caption:
                        `╭━━━〔 ☠︎︎ *𝐀 𝐂 𝐒 𝐓 𝐎 𝐍 𝐌 𝐎 𝐘* 〕━━━⬣\n` +
                        `┃ ✨ *Bot:* Online & Ready!\n` +
                        `┃ 🚀 *Status:* Fully Connected\n` +
                        `┃ ⚡ *Mode:* ${readDb().mode}\n` +
                        `┃ 📦 *Commands:* ${Object.keys(commands).length}\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━⬣`
                });
            } catch (error) {
                console.error("Owner notification error:", error.message);
            }
        }
    });

    // ==================================================
    // MESSAGE HANDLER
    // ==================================================

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        try {
            if (type !== "notify") return;

            const m = messages?.[0];
            if (!m?.message) return;

            const from = m.key.remoteJid;
            if (!from || from === "status@broadcast") return;

            const db = readDb();

            if (db.autoread) {
                try {
                    await sock.readMessages([m.key]);
                } catch (error) {
                    console.error("AutoRead Error:", error.message);
                }
            }

            if (db.autoreact && !m.key.fromMe) {
                try {
                    const emojis = ["💚", "🔥", "✨", "🙌", "💯", "👑", "🚀", "😍", "⚡", "💎"];
                    const emoji = emojis[Math.floor(Math.random() * emojis.length)];

                    await sock.sendMessage(from, {
                        react: { text: emoji, key: m.key }
                    });
                } catch (error) {
                    console.error("AutoReact Error:", error.message);
                }
            }

            const isGroup = from.endsWith("@g.us");
            const sender = m.key.participant || m.key.remoteJid;
            const senderNumber = getSenderNumber(sender);
            const ownerNumber = getNumber(settings.ownerNumber);
            const isOwner = senderNumber === ownerNumber || m.key.fromMe;

            const body = getMessageBody(m.message);
            if (!body) return;

            const prefix = settings.prefix || ".";

            if (db.mode === "private" && !isOwner) return;

            if (isGroup && db.antilink.includes(from)) {
                const linkRegex = /chat\.whatsapp\.com\/|https?:\/\/\S+/i;

                if (linkRegex.test(body)) {
                    try {
                        const metadata = await sock.groupMetadata(from);
                        const admins = metadata.participants
                            .filter(p => p.admin)
                            .map(p => p.id);

                        const isBotAdmin = admins.some(
                            jid => getSenderNumber(jid) === getSenderNumber(sock.user.id)
                        );

                        const isSenderAdmin = admins.some(
                            jid => getSenderNumber(jid) === senderNumber
                        );

                        if (!isSenderAdmin && !isOwner && isBotAdmin) {
                            await sock.sendMessage(from, { delete: m.key });

                            await sock.sendMessage(from, {
                                text: `🚫 *Link Detected!*\n\n@${senderNumber}, links are not allowed here!`,
                                mentions: [sender]
                            });
                        }
                    } catch (error) {
                        console.error("AntiLink Error:", error.message);
                    }
                }
            }

            if (!body.startsWith(prefix)) return;

            const input = body.slice(prefix.length).trim();
            if (!input) return;

            const parts = input.split(/\s+/);
            const commandName = parts.shift().toLowerCase();
            const args = parts;

            if (commandName === "antilink") {
                if (!isOwner) {
                    return sock.sendMessage(from, {
                        text: "❌ Only the bot owner can use this command."
                    }, { quoted: m });
                }

                if (args[0] === "on") {
                    if (!db.antilink.includes(from)) db.antilink.push(from);
                    saveDb(db);

                    return sock.sendMessage(from, {
                        text: "🛡️ AntiLink activated! ✅"
                    }, { quoted: m });
                }

                if (args[0] === "off") {
                    db.antilink = db.antilink.filter(id => id !== from);
                    saveDb(db);

                    return sock.sendMessage(from, {
                        text: "🛡️ AntiLink deactivated! ❌"
                    }, { quoted: m });
                }

                return sock.sendMessage(from, {
                    text: `Usage: ${prefix}antilink on/off`
                }, { quoted: m });
            }

            if (commandName === "setprefix") {
                if (!isOwner) {
                    return sock.sendMessage(from, {
                        text: "❌ Only the bot owner can use this command."
                    }, { quoted: m });
                }

                const newPrefix = args[0];

                if (!newPrefix || /\s/.test(newPrefix) || newPrefix.length > 5) {
                    return sock.sendMessage(from, {
                        text: `Usage: ${prefix}setprefix !`
                    }, { quoted: m });
                }

                try {
                    const settingsPath = path.join(__dirname, "settings.js");
                    let content = fs.readFileSync(settingsPath, "utf8");

                    if (/prefix\s*:/.test(content)) {
                        content = content.replace(
                            /prefix\s*:\s*(['"`]).*?\1/,
                            `prefix: ${JSON.stringify(newPrefix)}`
                        );
                    } else {
                        throw new Error("Could not find prefix in settings.js");
                    }

                    fs.writeFileSync(settingsPath, content, "utf8");
                    settings.prefix = newPrefix;

                    return sock.sendMessage(from, {
                        text: `✅ Prefix changed to: ${newPrefix}\nRestart the bot if it does not take effect.`
                    }, { quoted: m });
                } catch (error) {
                    console.error("SetPrefix Error:", error.message);

                    return sock.sendMessage(from, {
                        text: "❌ Failed to update settings.js"
                    }, { quoted: m });
                }
            }

            const aliases = {
                ig: "igdl",
                instagram: "igdl",
                song: "play",
                mp3: "play",
                mp4: "video",
                yt: "video"
            };

            const resolvedCommand = aliases[commandName] || commandName;

            if (commands[resolvedCommand]) {
                try {
                    await commands[resolvedCommand](sock, m, args);
                } catch (error) {
                    console.error(`Command Error (${commandName}):`, error);

                    await sock.sendMessage(from, {
                        text: `❌ Command Error: ${commandName}\n${error.message}`
                    }, { quoted: m });
                }
            }
        } catch (error) {
            console.error("Message Handler Error:", error);
        }
    });
                    }
