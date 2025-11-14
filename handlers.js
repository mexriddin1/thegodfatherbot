const {Markup} = require("telegraf");
const {
    getSeriesTitles,
    getSeriesSeasons,
    escapeMarkdownV2,
    mainMenuKeyboard,
    createContentDescription,
    createContentDescriptionForItem,
} = require("./utils");

const userState = new Map();

const setupHandlers = (bot, data, channelUsername) => {
    const sendWelcome = (ctx) => {
        userState.delete(ctx.chat.id);
        ctx.reply(
            "🎬 Assalomu alaykum! Kino va seriallar botiga xush kelibsiz! 🍿\n\nQuyidagi menyudan o'zingizni qiziqtirgan bo'limni tanlang 👇",
            mainMenuKeyboard()
        );
    };

    bot.start(sendWelcome);
    bot.hears("Bosh menyu");

    bot.hears("🔍 Qidiruv", (ctx) => {
        userState.set(ctx.chat.id, {mode: 'search'});
        ctx.reply("Menga izlayotgan kino yoki serial nomini yozing:", mainMenuKeyboard());
    });

    bot.hears("🎬 Seriallar", (ctx) => {
        userState.set(ctx.chat.id, {mode: 'series_list'});
        const titles = getSeriesTitles(data);
        if (titles.length === 0) return ctx.reply("Ma'lumotlar bazasida serial topilmadi.", mainMenuKeyboard());

        const buttons = titles.map(t => [`📺 ${t}`]);

        ctx.reply("📺 Seriallardan birini tanlang:",
            Markup.keyboard(buttons.concat([["Bosh menyu"]]))
                .resize()
        );
    });

    bot.hears("🎞️ Kinolar", (ctx) => {
        userState.set(ctx.chat.id, {mode: 'movies_list'});
        const movies = data.filter((item) => item.type === "movie");
        if (movies.length === 0) return ctx.reply("Ma'lumotlar bazasida kinolar topilmadi.", mainMenuKeyboard());

        const buttons = movies.map((m) => [`🎞️ ${m.title}`]);

        ctx.reply("🎥 Kinolardan birini tanlang:",
            Markup.keyboard(buttons.concat([["Bosh menyu"]]))
                .resize()
        );
    });

    bot.on("text", async (ctx) => {
        const text = ctx.message.text;
        const chatId = ctx.chat.id;
        const state = userState.get(chatId) || {mode: 'main'};

        if (["🔍 Qidiruv", "🎬 Seriallar", "🎞️ Kinolar"].includes(text)) {
            return;
        }

        if (state.mode === 'search') {
            userState.delete(chatId);

            if (text.length < 3) {
                return ctx.reply("Iltimos, qidirish uchun kamida 3 ta belgi kiriting.", mainMenuKeyboard());
            }

            const results = data.filter(item =>
                item.title.toLowerCase().includes(text.toLowerCase())
            );

            if (results.length === 0) {
                return ctx.reply(`Natija topilmadi: "${text}"`, mainMenuKeyboard());
            }

            const uniqueTitles = [...new Set(results.map(r => r.title))];
            const buttons = uniqueTitles.map(title => {
                const item = data.find(r => r.title === title);
                return [`${item.type === 'series' ? '📺' : '🎞️'} ${title}`];
            });

            userState.set(chatId, {
                mode: 'search_results',
                results: uniqueTitles
            });

            return ctx.reply(
                `🔍 Qidiruv natijalari (${buttons.length} ta):`,
                Markup.keyboard([...buttons, ["Bosh menyu"]])
                    .resize()
            );
        }

        let matchedItem = null;

        if (text.startsWith('📺 ')) {
            const title = text.replace('📺 ', '');
            matchedItem = data.find(item =>
                item.title === title && item.type === 'series'
            );
        } else if (text.startsWith('🎞️ ')) {
            const title = text.replace('🎞️ ', '');
            matchedItem = data.find(item =>
                item.title === title && item.type === 'movie'
            );
        }
        if (!matchedItem) {
            matchedItem = data.find(item => item.title === text);
        }

        if (matchedItem) {
            const title = matchedItem.title;
            const type = matchedItem.type;

            if (type === 'series') {
                const seasons = getSeriesSeasons(data, title);
                if (seasons.length === 0) {
                    return ctx.reply(`"${title}" uchun sezonlar topilmadi.`, mainMenuKeyboard());
                }

                const description = createContentDescription(matchedItem, data);
                const seasonButtons = seasons.map(s => [`${s}\-sezon`]);

                userState.set(chatId, {
                    mode: 'season_select',
                    title: title
                });

                return ctx.reply(
                    description + "*Sezonni tanlang* 👇",
                    {
                        parse_mode: "MarkdownV2",
                        ...Markup.keyboard([...seasonButtons, ["Orqaga", "Bosh menyu"]])
                            .resize()
                    }
                );

            } else if (type === 'movie') {
                const description = createContentDescription(matchedItem, data);

                userState.set(chatId, {
                    mode: 'movie_confirm',
                    title: title,
                    message_id: matchedItem.message_id
                });

                return ctx.reply(
                    description + "\n\nKino yuborilsinmi?",
                    {
                        parse_mode: "MarkdownV2",
                        ...Markup.keyboard([
                            ["Ha, yuborish"],
                            ["Yo'q, orqaga"],
                            ["Bosh menyu"]
                        ])
                            .resize()
                    }
                );
            }
        }

        if (state.mode === 'season_select' && text.endsWith('-sezon')) {
            const season = text.replace('-sezon', '');
            const title = state.title;

            const episodes = data
                .filter(item =>
                    item.title === title &&
                    item.season == season &&
                    item.type === "series"
                )
                .sort((a, b) => a.episode - b.episode);

            if (episodes.length === 0) {
                return ctx.reply(`${season} sezon uchun epizodlar topilmadi.`, mainMenuKeyboard());
            }

            const episodeButtons = [];
            for (let i = 0; i < episodes.length; i += 2) {
                const row = [`${episodes[i].episode}\-qism 📁`];
                if (episodes[i + 1]) {
                    row.push(`${episodes[i + 1].episode}\-qism 📁`);
                }
                episodeButtons.push(row);
            }

            userState.set(chatId, {
                mode: 'episode_select',
                title: title,
                season: season,
                episodes: episodes
            });

            return ctx.reply(
                `*${escapeMarkdownV2(title)}* ${escapeMarkdownV2(season)} sezon\nJami ${episodes.length} ta qism:\n\nQismni tanlang:`,
                {
                    parse_mode: "MarkdownV2",
                    ...Markup.keyboard([...episodeButtons, ["Orqaga", "Bosh menyu"]])
                        .resize()
                }
            );
        }

        if (state.mode === 'episode_select' && text.endsWith('-qism 📁')) {
            const episodeNum = parseInt(text.replace('-qism 📁', ''), 10);
            const episode = state.episodes.find(e => e.episode === episodeNum);

            if (!episode) {
                return ctx.reply(`${episodeNum} qism topilmadi.`, mainMenuKeyboard());
            }

            const description = createContentDescriptionForItem(episode, data);

            try {
                await ctx.telegram.copyMessage(
                    ctx.chat.id,
                    channelUsername,
                    episode.message_id,
                    {
                        caption: description,
                        parse_mode: 'MarkdownV2',
                    }
                );

            } catch (e) {
                console.error("Xato:", e);
                await ctx.reply(`Xatolik yuz berdi. Qayta urinib ko'ring.`, mainMenuKeyboard());
            }
            return;
        }

        if (state.mode === 'movie_confirm' && text === "Ha, yuborish") {
            const item = data.find(d => d.message_id === state.message_id);

            if (!item) {
                return ctx.reply("Kino topilmadi.", mainMenuKeyboard());
            }

            const description = createContentDescriptionForItem(item, data);

            try {
                await ctx.telegram.copyMessage(
                    ctx.chat.id,
                    channelUsername,
                    state.message_id,
                    {
                        caption: description,
                        parse_mode: 'MarkdownV2',
                    }
                );

                userState.delete(chatId);

            } catch (e) {
                console.error("Xato:", e);
                await ctx.reply(`Xatolik yuz berdi. Qayta urinib ko'ring.`, mainMenuKeyboard());
            }
            return;
        }

        if (text === "Orqaga" || text === "Yo'q, orqaga") {
            const prevState = userState.get(chatId);

            if (prevState?.mode === 'season_select') {
                userState.set(chatId, {mode: 'series_list'});
                return bot.handleUpdate({message: {text: "🎬 Seriallar", chat: {id: chatId}}});
            } else if (prevState?.mode === 'episode_select') {
                const title = prevState.title;
                const seasons = getSeriesSeasons(data, title);
                const firstItem = data.find(d => d.title === title && d.type === 'series');
                const description = createContentDescription(firstItem, data);
                const seasonButtons = seasons.map(s => [`${s} sezon`]);

                userState.set(chatId, {mode: 'season_select', title: title});

                return ctx.reply(
                    description + "\n\nSezonni tanlang:",
                    {
                        parse_mode: "MarkdownV2",
                        ...Markup.keyboard([...seasonButtons, ["Orqaga", "Bosh menyu"]])
                            .resize()
                    }
                );
            } else if (prevState?.mode === 'movie_confirm') {
                userState.set(chatId, {mode: 'movies_list'});
                return bot.handleUpdate({message: {text: "🎞️ Kinolar", chat: {id: chatId}}});
            } else {
                return sendWelcome(ctx);
            }
        }

        return ctx.reply("Iltimos, menyudan tanlang:", mainMenuKeyboard());
    });
};

module.exports = {setupHandlers};