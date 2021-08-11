const { request } = require('graphql-request')
const { GET_USERINFO } = require('../queries')
const path = require('path')
const { SlashCommandBuilder } = require('@discordjs/builders')
const fs = require('fs')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('url')
    .setDescription('Return the url of an AniList user')
    .addStringOption(opt =>
      opt
        .setName('user')
        .setDescription('AniList username or Discord tag')
        .setRequired(true)
      ),
  async execute(interaction) {
    const name = interaction.options.getString('user')
    
    try {
      if (name.startsWith('<')) {
        let usersjson = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
        let usersArray = JSON.parse(usersjson)
        const modArray = usersArray[usersArray.findIndex((x) => Object.keys(x)[0] === interaction.guildId)][interaction.guildId]
        const user = modArray[name]
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: user})
        interaction.reply(userData.User.siteUrl)
      }
      else {
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, { name })
        interaction.reply(userData.User.siteUrl)
      }
    } catch (err) {
      console.log('User failed to use /url')
      interaction.reply({ content: 'Command failed, user might not be aliased. `/alias add`', ephemeral: true })
    }
  }
}