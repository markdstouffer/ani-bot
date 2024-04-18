// import types
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import { Client, Collection, Events, GatewayIntentBits, Message } from 'discord.js'
import fs from 'fs'
import path from 'path'
require('dotenv').config()

const myIntents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildEmojisAndStickers,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.DirectMessageReactions
]

export const client = new Client({ intents: myIntents })
client.commands = new Collection()

const commands: any[] = []
const commandFiles = fs.readdirSync(path.resolve(__dirname, './commands')).filter((file: string) => file.endsWith('.ts'))

for (const file of commandFiles) {
  const command = require(`./commands/${file}`)
  client.commands.set(command.data.name, command)
  if (!command.data.options) {
    commands.push(command.data)
  } else {
    commands.push(command.data.toJSON())
  }
}

client.on('ready', async () => {
  console.log(`Logged in as ${client.user!.tag}!`)
})

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error)
})

client.on('messageCreate', async (message: Message) => {
  if (message.content === '$deploy') {
    const rest = new REST({ version: '9' }).setToken(process.env.TOKEN!);
    (async () => {
      try {
        console.log('Started refreshing slash commands...')
        await rest.put(
          Routes.applicationCommands(process.env.CLIENT_ID!),
          { body: commands }
        )
        console.log('Successfully refreshed slash commands!')
      } catch (error) {
        console.error(error)
      }
    })()
  }
})

client.on(Events.InteractionCreate, async interaction => {
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
