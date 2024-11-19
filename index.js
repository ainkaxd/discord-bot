const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const { token } = require('./config.json');
const playdl = require('play-dl');
const { generateDependencyReport } = require('@discordjs/voice');
console.log(generateDependencyReport());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let player;
let connection;
let queue = [];
let currentMessage;
let isRepeat = false;

playdl.setToken({
    youtube: { cookie: './cookies.json' }
});

client.once('ready', () => {
    console.log('Bot is online!');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const { commandName } = interaction;

        if (commandName === 'play') {
            const url = interaction.options.getString('url');
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply('Ты должен быть в голосовом канале, чтобы играть музыку!');
            }

            await interaction.deferReply();

            if (!connection) {
                connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });

                connection.on(VoiceConnectionStatus.Ready, () => {
                    console.log('Бот подключился к голосовому каналу.');
                });

                connection.on(VoiceConnectionStatus.Disconnected, () => {
                    console.log('Бот отключен от голосового канала.');
                    queue = [];
                    if (player) player.stop();
                    connection = null;
                });
            }

            queue.push(url);

            const buttons = createControlButtons();

            if (!currentMessage) {
                currentMessage = await interaction.followUp({
                    content: `Добавлено в очередь: ${url}`,
                    components: buttons
                });
            } else {
                await currentMessage.edit({
                    content: `Добавлено в очередь: ${url}`,
                    components: buttons
                });
            }

            if (queue.length === 1) {
                playSong(queue[0], interaction);
            }
        }
    } else if (interaction.isButton()) {
        const buttonId = interaction.customId;
        if (buttonId === 'play') {
            if (player) player.unpause();
            await interaction.update({ content: 'Музыка продолжена!', components: createControlButtons() });
        } else if (buttonId === 'pause') {
            if (player) player.pause();
            await interaction.update({ content: 'Музыка на паузе.', components: createControlButtons() });
        } else if (buttonId === 'stop') {
            queue = [];
            isRepeat = false;
            if (player) player.stop();
            if (connection) connection.destroy();
            connection = null;
            await interaction.update({ content: 'Музыка остановлена и очередь очищена.', components: [] });
            currentMessage = null;
        } else if (buttonId === 'skip') {
            if (queue.length > 1) {
                queue.shift();
                playSong(queue[0], interaction);
                await interaction.update({ content: 'Пропущено, играет следующая песня.', components: createControlButtons() });
            } else {
                await interaction.update({ content: 'Больше песен нет в очереди.', components: createControlButtons() });
            }
        } else if (buttonId === 'back') {
            if (queue.length > 1) {
                queue.unshift(queue[queue.length - 1]);
                playSong(queue[0], interaction);
                await interaction.update({ content: 'Возвращаемся к предыдущей песне.', components: createControlButtons() });
            }
        } else if (buttonId === 'repeat') {
            isRepeat = !isRepeat;
            const repeatStatus = isRepeat ? 'включен' : 'выключен';
            await interaction.update({ content: `Повтор ${repeatStatus}.`, components: createControlButtons() });
        } else if (buttonId === 'queue') {
            const queueList = queue.map((song, index) => `${index + 1}. ${song}`).join('\n');
            await interaction.update({ content: `Текущая очередь:\n${queueList}`, components: createControlButtons() });
        }
    }
});

async function playSong(url, interaction) {
    try {
        console.log(`Попытка воспроизвести: ${url}`);

        const stream = await playdl.stream(url); 
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type
        });

        if (!player) {
            player = createAudioPlayer();

            player.on('error', error => {
                console.error(`Ошибка в плеере: ${error.message}`);
            });

            player.on(AudioPlayerStatus.Idle, async () => {
                if (isRepeat) {
                    playSong(url, interaction);
                } else {
                    queue.shift();
                    if (queue.length > 0) {
                        await playSong(queue[0], interaction);
                    } else {
                        if (currentMessage) {
                            await currentMessage.edit({
                                content: 'нету треков в очереди(',
                                components: []
                            });
                            currentMessage = null;
                        }
                    }
                }
            });
        }

        player.play(resource);
        connection.subscribe(player);

        const buttons = createControlButtons();
        if (currentMessage) {
            await currentMessage.edit({
                content: `ебашит в уши: ${url}`,
                components: buttons
            });
        } else {
            currentMessage = await interaction.followUp({
                content: `ебашит в уши прям ща: ${url}`,
                components: buttons
            });
        }
    } catch (error) {
        console.error(`не получись врубить музон: ${error.message}`);
        if (currentMessage) {
            await currentMessage.edit({ content: 'что то пошло не так', components: [] });
        } else {
            await interaction.followUp('девелопер хуесос ниче не работает');
        }
    }
}

function createControlButtons() {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('play').setLabel('▶️ ').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('pause').setLabel('⏸️ ').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('skip').setLabel('⏭️ ').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('stop').setLabel('⏹️ ').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('back').setLabel('⏮️ ').setStyle(ButtonStyle.Secondary)
        );
    
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('repeat').setLabel('🔁 ').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('queue').setLabel('📜 ').setStyle(ButtonStyle.Secondary)
        );

    return [row1, row2];
}

client.login(token);
