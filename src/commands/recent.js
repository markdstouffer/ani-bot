const { request } = require('graphql-request')
const { GET_ACTIVITY, GET_USERINFO } = require('../queries')
const path = require('path')
const fs = require('fs')
let usersjson = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
let usersArray = JSON.parse(usersjson)

module.exports = {
  name: 'recent',
  description: 'Return the most recent activity given a username.',
	usage: '{anilist username | discord tag}',
  async execute(msg, args) {
    try {
      if (args[0].startsWith('<')) {
        const modArray = usersArray[usersArray.findIndex((x) => Object.keys(x)[0] === msg.guild.id)][msg.guild.id]
        const username = modArray[args[0]]
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: username})
        const activityData = await request('https://graphql.anilist.co', GET_ACTIVITY, {userId: userData.User.id})
        const activity = activityData.Page.activities[0]
        msg.reply(`${userData.User.name} - ${activity.status} ${activity.progress} (${activity.media.title.romaji})`)
      }
      else {
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: args[0]})
        const activityData = await request('https://graphql.anilist.co', GET_ACTIVITY, {userId: userData.User.id})
        const activity = activityData.Page.activities[0]
        msg.reply(`${userData.User.name} - ${activity.status} ${activity.progress} (${activity.media.title.romaji})`)
      }
    } catch {
      msg.reply('Usage: `$recent [anilist username]`')
    }
  }
}