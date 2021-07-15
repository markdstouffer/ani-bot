const { request } = require('graphql-request')
const { GET_ACTIVITY, GET_USERINFO } = require('../queries')
const fs = require('fs')
let usersjson = fs.readFileSync('C:/Users/markd/projects/discord-bots/ani-bot/src/members.json', 'utf-8')
let usersArray = JSON.parse(usersjson)

module.exports = {
  name: 'recent',
  description: 'Return the most recent activity given a username.',
	usage: '<anilist username>',
  async execute(msg, args) {
    try {
      if (args[0].startsWith('<')) {
        const id = args[0].slice(3, args[0].length-1)
        const user = usersArray.find(x => x.id === id)
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: user.username})
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