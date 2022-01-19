// Bot client startup file

// import types
import { CommandInteraction, Message } from 'discord.js'

const { Client, Collection, Intents } = require('discord.js')
require('dotenv').config()
const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v9')
const fs = require('fs')
const path = require('path')

const myIntents = new Intents()
myIntents.add('GUILDS', 'GUILD_MESSAGES', 'DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS', 'GUILD_MEMBERS', 'GUILD_EMOJIS_AND_STICKERS', 'GUILD_MESSAGE_REACTIONS')

export const client = new Client({ intents: myIntents })
client.commands = new Collection()

const commands: any[] = []
const commandFiles = fs.readdirSync(path.resolve(__dirname, './commands')).filter((file: string) => file.endsWith('.ts'))

// populate the commands array
for (const file of commandFiles) {
  const command = require(`./commands/${file}`)
  client.commands.set(command.data.name, command)
  if (!command.data.options) { // context menu interactions
    commands.push(command.data)
  } else { // all other interaction types
    commands.push(command.data.toJSON())
  }
}

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error)
})

// checks message content for "$deploy" to update guild/application commands
client.on('messageCreate', async (message: Message) => {
  if (message.content === '$deploy') {
    const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);
    (async () => {
      try {
        console.log('Started refreshing slash commands...')
        await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
          { body: commands }
        )
        console.log('Successfully refreshed slash commands!')
      } catch (error) {
        console.error(error)
      }
    })()
  }
})

// listens for all interactions, executes command if found
client.on('interactionCreate', async (interaction: CommandInteraction) => {
  if (!interaction.isCommand()) return
  if (!client.commands.has(interaction.commandName)) return

  try {
    await client.commands.get(interaction.commandName).execute(interaction)
  } catch (error) {
    console.error(error)
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
  }
})

client.login(process.env.TOKEN)
