const { REST, Routes } = require('discord.js');
const { clientId, token } = require('./config.json'); // Импорт данных из config.json

// Список ID серверов (гильдий), для которых нужно зарегистрировать команды
const guildIds = ['815871525872861224', '900407909802983474']; // Замени на реальные ID серверов

const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
    },
    {
        name: 'play',
        description: 'Plays a song from a YouTube link',
        options: [
            {
                name: 'url',
                description: 'The YouTube URL of the song',
                type: 3, // Тип данных 3 для строк
                required: true,
            },
        ],
    },
    {
        name: 'stop',
        description: 'Stops the currently playing song',
    },
    {
        name: 'pause',
        description: 'Pauses the currently playing song',
    },
    {
        name: 'resume',
        description: 'Resumes the paused song',
    },
    {
        name: 'skip',
        description: 'Skips to the next song in the queue',
    },
    {
        name: 'back',
        description: 'Goes back to the previous song in the queue',
    },
    {
        name: 'menu',
        description: 'Shows the music control menu',
    },
    {
        name: 'leave',
        description: 'Disconnect the bot from the voice channel',
    },
];

const rest = new REST({ version: '10' }).setToken(token);

guildIds.forEach(async (guildId) => {
    try {
        console.log(`Registering commands for guild ${guildId}`);
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );
        console.log(`Successfully registered commands for guild ${guildId}`);
    } catch (error) {
        console.error(`Error registering commands for guild ${guildId}:`, error);
    }
});
