const path = require('path')
const fs = require('fs')
const { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alias')
    .setDescription('Link a Discord tag to an AniList username')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add an alias, or edit an existing one')
        .addMentionableOption(option =>
          option
            .setName('discord')
            .setDescription('Discord tag')
            .setRequired(true)
          )
        .addStringOption(option =>
          option
            .setName('anilist')
            .setDescription('AniList username')
            .setRequired(true)
          )
      )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove alias from a Discord user')
        .addMentionableOption(option =>
          option
            .setName('discord')
            .setDescription('Discord tag')
            .setRequired(true)
          )
      ),
  async execute(interaction) {
    let aliasjson= fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
    let allAliasArray = JSON.parse(aliasjson)
    const server = interaction.guildId
    const sub = interaction.options.getSubcommand()
    const discord = `<@!${interaction.options.getMentionable('discord').user.id}>`
    const anilist = interaction.options.getString('anilist')
    
    let ind = allAliasArray.findIndex((x) => Object.keys(x)[0] === server)
    if (ind === -1) {
      const newServer = {}
      newServer[server] = {}
      allAliasArray.push(newServer)
    }
    ind = allAliasArray.findIndex((x) => Object.keys(x)[0] === server)
    
    let serverAliasArray = allAliasArray[ind][server]
    if (sub === 'add') {
      serverAliasArray[discord] = anilist
      interaction.reply(`Aliased ${discord} to ${anilist}`)
    } else if (sub == 'remove') {
      delete serverAliasArray[discord]
      interaction.reply(`Removed ${discord}'s alias`)
    }
    aliasjson = JSON.stringify(allAliasArray)
    fs.writeFileSync(path.resolve(__dirname, '../data/alias.json'), aliasjson, 'utf-8')
  }
}
