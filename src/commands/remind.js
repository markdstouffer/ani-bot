const fs = require('fs')
const path = require('path')
const { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Remind a baka to watch the current WP episodes')
    .addMentionableOption(opt =>
      opt
        .setName('discord')
        .setDescription('Discord tag')
        .setRequired(true)
      ),
  async execute(interaction) {
    const discord = interaction.options.getMentionable('discord')
    let serversjson = fs.readFileSync(path.resolve(__dirname, '../data/party.json'), 'utf-8')
    let allServers = JSON.parse(serversjson)
    const serverId = interaction.guildId
    let serverIndex = allServers.findIndex(x => Object.keys(x)[0] === serverId)
    let thisServer = allServers[serverIndex][serverId]

    const currentAnime = thisServer['current']

    interaction.reply({ content: `Ummm... ${discord}.. please don't forget to watch today's episodes of **${currentAnime}**, UwU.. Arigato! ^_^`})
  }
}