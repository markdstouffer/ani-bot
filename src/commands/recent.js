const { request } = require('graphql-request')
const { GET_ACTIVITY, GET_USERINFO } = require('../queries')
const Discord = require('discord.js')
const path = require('path')
const fs = require('fs')

module.exports = {
  name: 'recent',
  description: 'Return the most recent activity given a username.',
	usage: '{anilist username | discord tag}',
  async execute(msg, args) {
    let usersjson = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
    let usersArray = JSON.parse(usersjson)
    try {
      if (args[0].startsWith('<')) {
        const modArray = usersArray[usersArray.findIndex((x) => Object.keys(x)[0] === msg.guild.id)][msg.guild.id]
        const username = modArray[args[0]]
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
          msg.reply(embed)
        } else { msg.reply('This user has no recent activity :(') }
      }
      else {
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: args[0]})
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
          msg.reply(embed)
        } else { msg.reply('This user has no recent activity :(') }
        }
    } catch (err) {
      console.error(err)
      msg.reply('Usage: `$recent [anilist username | discord tag]`')
    }
  }
}