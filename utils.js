const {Markup} = require("telegraf");

const getSeriesTitles = (data) => {
    const series = data.filter((item) => item.type === "series");
    return [...new Set(series.map((s) => s.title))];
};

const getSeriesSeasons = (data, title) => {
    const series = data.filter(
        (item) => item.title === title && item.type === "series"
    );
    return [...new Set(series.map((s) => s.season))].sort((a, b) => a - b);
};

const escapeMarkdownV2 = (text) => {
    if (typeof text !== 'string') text = String(text);
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
};

const mainMenuKeyboard = () => {
    return Markup.keyboard([
        ["🔍 Qidiruv", "🎬 Seriallar", "🎞️ Kinolar"]
    ]).resize();
};

const createContentDescription = (item, data) => {
    const {title, type} = item;
    const itemType = type === 'series' ? '📺 Serial: ' : '🎞️ Kino: ';

    const firstItem = data.find(d => d.title === title && d.type === type);

    if (!firstItem) return `${title} haqida ma'lumot topilmadi\\.`;

    const safeTitle = escapeMarkdownV2(firstItem.title);
    const safeYear = escapeMarkdownV2(firstItem.year);
    const safeImdb = escapeMarkdownV2(firstItem.imdb);
    const format = escapeMarkdownV2(firstItem.formats.join(', '));
    const safeCountry = escapeMarkdownV2(firstItem.country);
    const safeGenres = escapeMarkdownV2(firstItem.genres.join(', '));
    const safeLanguages = escapeMarkdownV2(firstItem.languages.join(', '));
    const safeSubtitles = escapeMarkdownV2(firstItem.subtitles.join(', '));

    return (
        `*${itemType}* *${safeTitle}* *${safeYear}* \n\n` +
        `*IMDb*: ${safeImdb}\n` +
        `*Sifat*: ${format}\n` +
        `*Mamlakat*: ${safeCountry}\n` +
        `*Janrlar*: ${safeGenres}\n` +
        `*Tillar*: ${safeLanguages}\n` +
        `*Subtitrlar*: ${safeSubtitles}\n\n`
    );
};

const createContentDescriptionForItem = (item, data) => {
    const {title, type} = item;

    const itemType = type === 'series' ? '📺 Serial' : '🎞️ Kino';

    const serialInfo = item.type === 'series'
        ? `\n*${escapeMarkdownV2(String(item.season))}*\\-sezon, *${escapeMarkdownV2(String(item.episode))}*\\-qism\\.`
        : '';

    const firstItem = data.find(d => d.title === title && d.type === type);

    if (!firstItem) return `${title} haqida ma'lumot topilmadi\\.`;

    const safeTitle = escapeMarkdownV2(firstItem.title);
    const safeYear = escapeMarkdownV2(firstItem.year);
    const safeImdb = escapeMarkdownV2(firstItem.formats.join(', '));
    const format = escapeMarkdownV2(firstItem.genres.join(', '));
    const safeCountry = escapeMarkdownV2(firstItem.country);
    const safeGenres = escapeMarkdownV2(firstItem.genres.join(', '));
    const safeLanguages = escapeMarkdownV2(firstItem.languages.join(', '));
    const safeSubtitles = escapeMarkdownV2(firstItem.subtitles.join(', '));

    return (
        `*${safeTitle}* *${safeYear}* *${itemType}*\n\n` +
        `*IMDb*: ${safeImdb}\n` +
        `*Sifat*: ${format}\n` +
        `*Mamlakat*: ${safeCountry}\n` +
        `*Janrlar*: ${safeGenres}\n` +
        `*Tillar*: ${safeLanguages}\n` +
        `*Subtitrlar*: ${safeSubtitles}\n` +
        `*${serialInfo}*`
    );
};


module.exports = {
    getSeriesTitles,
    getSeriesSeasons,
    escapeMarkdownV2,
    mainMenuKeyboard,
    createContentDescription,
    createContentDescriptionForItem
};
