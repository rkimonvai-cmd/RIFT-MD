const axios = require("axios");
const yts = require("yt-search");
const settings = require("../settings");

// ╭──────────────────────────────╮
// │  𒁂 𝘼𝘾𝙎 𝙏𝙊𝙉𝙈𝙊𝙔 𒁂      │
// │       VIDEO DOWNLOADER       │
// ╰──────────────────────────────╯

const BRAND = "𒁂【 𝘼𝘾𝙎 𝙏𝙊𝙉𝙈𝙊𝙔 】𒁂";
const BOT_NAME = "𝘼𝘾𝙎 𝙏𝙊𝙉𝙈𝙊𝙔";

const channelInfo = {
    contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363407561123100@newsletter",
            newsletterName: "ACS TONMOY",
            serverMessageId: -1
        }
    }
};

const axiosConfig = {
    timeout: 60000,
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*"
    }
};

async function request(url) {
    const response = await axios.get(url, axiosConfig);
    return response;
}

// ═══════════════════════════════
//  SERVER 01 — ELITE PRO TECH
// ═══════════════════════════════

async function eliteProTech(url) {
    const api =
        "https://eliteprotech-apis.zone.id/ytdown?url=" +
        encodeURIComponent(url) +
        "&format=mp4";

    const { data = {} } = await request(api);

    if (data.success && data.downloadURL) {
        return {
            url: data.downloadURL,
            title: data.title
        };
    }

    throw new Error("EliteProTech unavailable");
}

// ═══════════════════════════════
//  SERVER 02 — YUPRA
// ═══════════════════════════════

async function yupra(url) {
    const api =
        "https://api.yupra.my.id/api/downloader/ytmp4?url=" +
        encodeURIComponent(url);

    const { data = {} } = await request(api);
    const result = data.data || {};

    if (data.success && result.download_url) {
        return {
            url: result.download_url,
            title: result.title,
            thumbnail: result.thumbnail
        };
    }

    throw new Error("Yupra unavailable");
}

// ═══════════════════════════════
//  SERVER 03 — OKATSU
// ═══════════════════════════════

async function okatsu(url) {
    const api =
        "https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=" +
        encodeURIComponent(url);

    const { data = {} } = await request(api);
    const result = data.result || {};

    if (result.mp4) {
        return {
            url: result.mp4,
            title: result.title
        };
    }

    throw new Error("Okatsu unavailable");
}

// ═══════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════

async function react(sock, m, emoji) {
    try {
        await sock.sendMessage(m.key.remoteJid, {
            react: {
                text: emoji,
                key: m.key
            }
        });
    } catch (error) {
        console.error("Reaction Error:", error.message);
    }
}

function cleanFileName(title) {
    return (
        String(title || "ACS-TONMOY-VIDEO")
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 100) || "ACS-TONMOY-VIDEO"
    );
}

// ═══════════════════════════════
//  MAIN VIDEO COMMAND
// ═══════════════════════════════

module.exports = async (sock, m, args) => {
    const chatId = m.key.remoteJid;

    try {
        const query = args.join(" ").trim();

        // Missing query
        if (!query) {
            const helpText = `
╭━━━〔 ${BRAND} 〕━━━⬣
┃
┃  ❌ *VIDEO QUERY REQUIRED*
┃
┃  🎬 Search by video name
┃  🔗 Or provide a YouTube URL
┃
┃  ━━━━━━━━━━━━━━━━━━━
┃  📌 *COMMAND*
┃  ${settings.prefix}video [name/link]
┃
┃  💡 *EXAMPLE*
┃  ${settings.prefix}video Alan Walker Faded
┃
╰━━━━━━━━━━━━━━━━━━━━⬣
`.trim();

            return await sock.sendMessage(
                chatId,
                {
                    text: helpText,
                    ...channelInfo
                },
                { quoted: m }
            );
        }

        await react(sock, m, "⏳");

        let youtubeUrl = "";
        let searchTitle = "";

        // Validate and resolve YouTube URL
        if (/^https?:\/\//i.test(query)) {
            let parsedUrl;

            try {
                parsedUrl = new URL(query);
            } catch {
                throw new Error("Invalid video URL");
            }

            const host = parsedUrl.hostname
                .toLowerCase()
                .replace(/^www\./, "");

            const validHost = [
                "youtube.com",
                "m.youtube.com",
                "music.youtube.com",
                "youtu.be"
            ];

            if (!validHost.includes(host)) {
                throw new Error("Please provide a valid YouTube URL");
            }

            youtubeUrl = query;
        } else {
            const search = await yts(query);

            if (!search.videos || search.videos.length === 0) {
                await react(sock, m, "❌");

                return await sock.sendMessage(
                    chatId,
                    {
                        text: `
╭━━━〔 ${BRAND} 〕━━━⬣
┃
┃  🔎 *NO VIDEO FOUND*
┃
┃  Try another title or search keyword.
┃
╰━━━━━━━━━━━━━━━━━━━━⬣`.trim(),
                        ...channelInfo
                    },
                    { quoted: m }
                );
            }

            const video = search.videos[0];

            youtubeUrl = video.url;
            searchTitle = String(video.title || "");
        }

        if (!youtubeUrl) {
            throw new Error("Unable to resolve YouTube URL");
        }

        // Downloader fallback system
        const servers = [
            {
                name: "EliteProTech",
                run: eliteProTech
            },
            {
                name: "Yupra",
                run: yupra
            },
            {
                name: "Okatsu",
                run: okatsu
            }
        ];

        let videoData = null;
        const failedServers = [];

        for (const server of servers) {
            try {
                console.log(`[ACS TONMOY] Trying ${server.name}`);

                const result = await server.run(youtubeUrl);

                if (
                    result &&
                    typeof result.url === "string" &&
                    /^https?:\/\//i.test(result.url)
                ) {
                    videoData = result;

                    console.log(
                        `[ACS TONMOY] ${server.name} succeeded`
                    );

                    break;
                }

                throw new Error("Invalid download URL");
            } catch (error) {
                failedServers.push(server.name);

                console.error(
                    `[ACS TONMOY] ${server.name} failed:`,
                    error.message
                );
            }
        }

        if (!videoData) {
            throw new Error("All downloader servers failed");
        }

        const title = String(
            videoData.title || searchTitle || "ACS TONMOY VIDEO"
        );

        const cleanTitle = cleanFileName(title);

        // Send video
        await sock.sendMessage(
            chatId,
            {
                video: {
                    url: videoData.url
                },
                mimetype: "video/mp4",
                fileName: `${cleanTitle}.mp4`,
                caption: `
╭━━━〔 🎬 𝙑𝙄𝘿𝙀𝙊 𝘿𝙊𝙒𝙉𝙇𝙊𝘼𝘿 〕━━━⬣
┃
┃  👑 *OWNER:* ACS TONMOY
┃  🤖 *BOT:* ${BOT_NAME}
┃  ⚡ *STATUS:* SUCCESS
┃
┃  🎥 *TITLE:*
┃  ${title.slice(0, 300)}
┃
┃  🛡️ *ENGINE:* AUTO FALLBACK
┃  ✅ *DOWNLOAD:* COMPLETED
┃
╰━━━━━━━━━━━━━━━━━━━━⬣

        𒁂 𝘼𝘾𝙎 𝙏𝙊𝙉𝙈𝙊𝙔 𒁂
`.trim(),
                ...channelInfo
            },
            { quoted: m }
        );

        await react(sock, m, "✅");

    } catch (error) {
        console.error("[ACS TONMOY] VIDEO ERROR:", error);

        await react(sock, m, "❌");

        let reason = "All video servers are unavailable or timed out.";

        if (error.message === "Invalid video URL") {
            reason = "The supplied URL is invalid.";
        } else if (
            error.message === "Please provide a valid YouTube URL"
        ) {
            reason = "Please use a supported YouTube video URL.";
        } else if (
            error.message === "All downloader servers failed"
        ) {
            reason = "All three downloader servers failed. Try again later.";
        }

        await sock.sendMessage(
            chatId,
            {
                text: `
╭━━━〔 ${BRAND} 〕━━━⬣
┃
┃  ❌ *VIDEO DOWNLOAD FAILED*
┃
┃  ⚠️ *REASON:*
┃  ${reason}
┃
┃  🔄 Try again later.
┃
╰━━━━━━━━━━━━━━━━━━━━⬣
`.trim(),
                ...channelInfo
            },
            { quoted: m }
        );
    }
};
