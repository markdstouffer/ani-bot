const Discord = require('discord.js')
require('dotenv').config()
const { prefix } = require('./config.json')

const client = new Discord.Client()
client.commands = new Discord.Collection()
const botCommands = require('./commands')

Object.keys(botCommands).map(key => {
  client.commands.set(botCommands[key].name, botCommands[key])
})

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on('message', message => {
  if (message.content.startsWith(prefix)) {
    const args = message.content.slice(prefix.length).trim().split(/ +/)
    const commandName = args.shift().toLowerCase()
    const command = client.commands.get(commandName)
      || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))

    if (!command) return null;
  
    try {
      command.execute(message, args)
    } catch (err) {
      console.error(err)
      msg.reply('error executing that command')
    }
  }
})

client.login(process.env.TOKEN)