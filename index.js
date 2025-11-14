const express = require("express");
const fs = require("fs");
const path = require("path");
const { Telegraf } = require("telegraf");
const { setupHandlers } = require("./handlers");

const BOT_TOKEN = process.env.BOT_TOKEN || "8218995698:AAFZ1BZDifLQHylU04GxCpakEx0DxKoPvr0";
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || "@jbbQRGWmhe5lM2My";
const PORT = process.env.PORT || 4040;

const DATA_FILE = path.resolve(__dirname, "narcos.json");
let data = [];

try {
    const fileContent = fs.readFileSync(DATA_FILE, "utf8");
    data = JSON.parse(fileContent);
    console.log(`Data loaded successfully from ${DATA_FILE}. Total items: ${data.length}`);
} catch (error) {
    console.error("ERROR: Could not load or parse narcos.json.");
    console.error(error.message);
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

setupHandlers(bot, data, CHANNEL_USERNAME);

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Telegram Media Bot is running on server!");
});

bot.launch()
    .then(() => console.log("Telegram Bot is connected and running..."))
    .catch((err) => {
        console.error("Failed to launch bot:", err.message);
        process.exit(1);
    });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

app.listen(PORT, () => console.log(`Server listening on PORT ${PORT}`));
