// import types
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import { ChatInputCommandInteraction, Client, Collection, Events, GatewayIntentBits } from 'discord.js'
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

const commandsPath = path.join(__dirname, 'commands')

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'))
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file)
  const command = require(filePath)
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command)
    commands.push(command.data)
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`)
  }
}

client.once(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}!`)

  const rest = new REST({ version: '9' }).setToken(process.env.TOKEN!);
  (async () => {
    try {
      console.log(`Started refreshing ${commands.length} application (/) commands.`)

      const data: any = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
        { body: commands }
      )

      console.log(`Successfully reloaded ${data.length} application (/) commands.`)
    } catch (error) {
      console.error(error)
    }
  })()
})

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error)
})

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return

  const command = interaction.client.commands.get(interaction.commandName)

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`)
    return
  }

  try {
    await command.execute(interaction as ChatInputCommandInteraction)
  } catch (error) {
    console.error(error)
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true })
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
    }
  }
})

client.login(process.env.TOKEN)
