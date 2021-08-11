const { request } = require('graphql-request')
const { GET_ACTIVITY, GET_USERINFO } = require('../queries')
const { SlashCommandBuilder } = require('@discordjs/builders')
const Discord = require('discord.js')
const path = require('path')
const fs = require('fs')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recent')
    .setDescription('Returns a user\'s most recent anime-list activity.')
    .addStringOption(opt =>
      opt
        .setName('name')
        .setDescription('AniList username or Discord tag')
        .setRequired(true)
    ),
  async execute(interaction) {
    let usersjson = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
    let usersArray = JSON.parse(usersjson)
    const name = interaction.options.getString('name')

    try {
      if (name.startsWith('<')) {
        const modArray = usersArray[usersArray.findIndex((x) => Object.keys(x)[0] === interaction.guildId)][interaction.guildId]
        const username = modArray[name]
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: username})
        const activityData = await request('https://graphql.anilist.co', GET_ACTIVITY, {userId: userData.User.id})
        const activity = activityData.Page.activities[0]
        if (activity) {
          const stat = (activity.progress && activity.progress.includes('-'))
          ? `${activity.status}s`
          : `${activity.status}`
          const statProg = activity.progress
          ? `${stat} ${activity.progress} of`
          : `${stat}`

          const embed = new Discord.MessageEmbed()
            .setTitle(userData.User.name)
            .setColor(activity.media.coverImage.color)
            .setThumbnail(userData.User.avatar.large)
            .addField(statProg, `[**${activity.media.title.romaji}**](${activity.media.siteUrl})`)
          interaction.reply({ embeds: [embed] })
        } else { interaction.reply('This user has no recent activity :(') }
      }
      else {
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, { name })
        const activityData = await request('https://graphql.anilist.co', GET_ACTIVITY, {userId: userData.User.id})
        const activity = activityData.Page.activities[0]
        if (activity) {
          const stat = (activity.progress && activity.progress.includes('-'))
          ? `${activity.status}s`
          : `${activity.status}`
          const statProg = activity.progress
          ? `${stat} ${activity.progress} of`
          : `${stat}`

          const embed = new Discord.MessageEmbed()
            .setTitle(userData.User.name)
            .setColor(activity.media.coverImage.color)
            .setThumbnail(userData.User.avatar.large)
            .addField(statProg, `[**${activity.media.title.romaji}**](${activity.media.siteUrl})`)
          interaction.reply({ embeds: [embed] })
        } else { interaction.reply('This user has no recent activity :(') }
        }
    } catch (err) {
      console.log('User failed to use /recent')
      console.error(err)
      interaction.reply({ content: 'Command failed, check usage', ephemeral: true })
    }
  }
}