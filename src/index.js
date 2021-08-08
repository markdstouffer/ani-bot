const {Client, Collection, Intents} = require('discord.js')
require('dotenv').config()

const myIntents = new Intents()
myIntents.add('GUILDS', 'GUILD_MESSAGES', 'DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS', 'GUILD_MEMBERS', 'GUILD_EMOJIS_AND_STICKERS', 'GUILD_MESSAGE_REACTIONS')

const client = new Client({intents: myIntents})
client.commands = new Collection()
const botCommands = require('./commands')

Object.keys(botCommands).map(key => {
  client.commands.set(botCommands[key].name, botCommands[key])
})

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error)
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  if (!client.commands.has(interaction.commandName)) return;

  try {
    await client.commands.get(interaction.commandName).execute(interaction)
  } catch (error) {
    console.error(error)
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
  }

})

const guildId = '503045148570288129'

client.on('messageCreate', async message => {

  if (!client.application?.owner) await client.application?.fetch()

  if (message.content.toLowerCase() === '!deploy' && message.author.id === client.application?.owner.id) {
    const data = [
      {
        name: 'progress',
        description: 'Returns how many episodes of an anime a user has watched.',
        options: [
          {
            name: 'all',
            description: 'Get progress for all aliased members in server.',
            type: 'SUB_COMMAND',
            options: [
              {
                name: 'anime',
                description: 'Anime title',
                type: 'STRING',
                required: true
              }
            ]
          },
          {
            name: 'user',
            description: 'Get progress for one user.',
            type: 'SUB_COMMAND',
            options: [
              {
                name: 'user',
                description: 'AniList username',
                type: 3,
                required: true
              },
              {
                name: 'anime',
                description: 'Anime title',
                type: 3,
                required: true
              }
            ]
          }
        ]
      },
      {
        name: 'ping',
        description: 'Responds with Pong!'
      },
      {
        name: 'wp',
        description: 'Anime watch-parties',
        options: [
          {
            name: 'view',
            description: 'View watch-party progress',
            type: 1
          },
          {
            name: 'suggest',
            description: 'Suggest a watch-party subject',
            type: 1,
            options: [
              {
                name: 'title',
                description: 'Anime title',
                type: 3,
                required: true
              }
            ]
          },
          {
            name: 'set',
            description: 'Set one of the suggested watch-parties as the current one.',
            type: 1
          },
          {
            name: 'delete',
            description: 'Delete a suggested watch-party from the list.',
            type: 1
          },
          {
            name: 'list',
            description: 'List all the suggested watch-parties.',
            type: 1
          },
          {
            name: 'join',
            description: 'Join a watch-party',
            type: 1
          },
          {
            name: 'leave',
            description: 'Leave a watch-party',
            type: 1,
          }
        ]
      },
      {
        name: 'url',
        description: 'Return the url of an AniList user',
        options: [
          {
            name: 'user',
            description: 'AniList username or Discord tag',
            type: 3,
            required: true
          }
        ]
      },
      {
        name: 'rating',
        description: 'Returns a user\'s rating of an anime.',
        options: [
          {
            name: 'all',
            description: 'Returns all aliased server members ratings for an anime',
            type: 1,
            options: [
              {
                name: 'title',
                description: 'Anime title',
                required: true,
                type: 3
              }
            ]
          },
          {
            name: 'user',
            description: 'Returns rating of one user',
            type: 1,
            options: [
              {
                name: 'name',
                description: 'AniList username or Discord tag',
                required: true,
                type: 3
              },
              {
                name: 'title',
                description: 'Anime title',
                required: true,
                type: 3
              }
            ]
          }
        ]
      },
      {
        name: 'recent',
        description: 'Returns a user\'s most recent anime-list activity.',
        options: [
          {
            name: 'name',
            description: 'AniList username or Discord tag',
            type: 3,
            required: true
          }
        ]
      },
      {
        name: 'ep',
        description: 'Check or set current watch-party assigned episodes',
        options: [
          {
            name: 'today',
            description: 'View today\'s assigned episodes',
            type: 1
          },
          {
            name: 'next',
            description: 'Increment episodes and create a discussion thread',
            type: 1,
            options: [
              {
                name: 'amount',
                description: 'Amount of episodes to assign',
                type: 4,
                required: true
              }
            ]
          }
        ]
      },
      {
        name: 'alias',
        description: 'Link a Discord tag to an AniList username',
        options: [
          {
            name: 'add',
            description: 'Add an alias, or edit an existing one',
            type: 1,
            options: [
              {
                name: 'discord',
                description: 'Discord tag',
                type: 9,
                required: true
              },
              {
                name: 'anilist',
                description: 'AniList username',
                type: 3,
                required: true
              }
            ]
          },
          {
            name: 'remove',
            description: 'Remove alias from a Discord user',
            type: 1,
            options: [
              {
                name: 'discord',
                description: 'Discord tag',
                type: 9,
                required: true
              }
            ]
          }
        ]
      },
      {
        name: 'search',
        description: 'Search for an anime',
        options: [
          {
            name: 'title',
            description: 'Anime title',
            type: 3,
            required: true
          }
        ]
      }
    ]
    const emptyData = []

    const commands = await client.guilds.cache.get(guildId)?.commands.set(data)
  }
})

client.login(process.env.TOKEN)