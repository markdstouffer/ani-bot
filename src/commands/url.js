const { request } = require('graphql-request')
const { GET_USERINFO } = require('../queries')
const fs = require('fs')
let usersjson = fs.readFileSync('C:/Users/markd/projects/discord-bots/ani-bot/src/members.json', 'utf-8')
let usersArray = JSON.parse(usersjson)

module.exports = {
  name: 'url',
  aliases: ['user', 'u'],
	usage: '<anilist username>',
  description: 'Return the url of an anilist user, given their username.',
  async execute(msg, args) {
    try {
      if (args[0].startsWith('<')) {
        const id = args[0].slice(3, args[0].length-1)
        const user = usersArray.find(x => x.id === id)
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: user.username})
        msg.reply(userData.User.siteUrl)
      }
      else {
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: args[0]})
        msg.reply(userData.User.siteUrl)
      }
    } catch {
      msg.reply('Usage: `$url [anilist username]`')
    }
  }
}