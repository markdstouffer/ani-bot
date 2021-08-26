// import types
import { Interaction, Message } from 'discord.js'
// import express from 'express'
// const app = express()
// const port = 3000
// app.get('/', (_req, res) => res.send('Hello World!'))
// app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
// ABOVE IS CODE JUST REQUIRED TO HOST ON REPL

const { Client, Collection, Intents } = require('discord.js')
require('dotenv').config()
const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v9')
const fs = require('fs')
const path = require('path')

const myIntents = new Intents()
myIntents.add('GUILDS', 'GUILD_MESSAGES', 'DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS', 'GUILD_MEMBERS', 'GUILD_EMOJIS_AND_STICKERS', 'GUILD_MESSAGE_REACTIONS')

const client = new Client({ intents: myIntents })
client.commands = new Collection()

const commands: any[] = []
const commandFiles = fs.readdirSync(path.resolve(__dirname, './commands'))

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
  console.log(`Logged in as ${client.user.tag}!`)
})

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error)
})

client.on('messageCreate', async (message: Message) => {
  if (message.content === '$deploy') {
    const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);
    (async () => {
      try {
        console.log('Started refreshing slash commands...')
        await rest.put(
          // Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
          // { body: commands }
          Routes.applicationCommands(process.env.CLIENT_ID),
          { body: commands }
        )
        console.log('Successfully refreshed slash commands!')
      } catch (error) {
        console.error(error)
      }
    })()
  }
})

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isCommand() && !interaction.isContextMenu()) return
  if (!client.commands.has(interaction.commandName)) return

  try {
    await client.commands.get(interaction.commandName).execute(interaction)
  } catch (error) {
    console.error(error)
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
  }
})

client.login(process.env.TOKEN)
