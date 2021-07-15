const { request } = require('graphql-request')
const { GET_USERINFO } = require('../queries')
const path = require('path')
const fs = require('fs')
let usersjson = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
let usersArray = JSON.parse(usersjson)

module.exports = {
  name: 'url',
  aliases: ['user', 'u'],
	usage: '<anilist username>',
  description: 'Return the url of an anilist user, given their username.',
  async execute(msg, args) {
    try {
      if (args[0].startsWith('<')) {
        const modArray = usersArray[usersArray.findIndex((x) => Object.keys(x)[0] === msg.guild.id)][msg.guild.id]
        const user = modArray[args[0]]
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: user})
        msg.reply(userData.User.siteUrl)
      }
      else {
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: args[0]})
        msg.reply(userData.User.siteUrl)
      }
    } catch (err) {
      console.error(err)
      msg.reply('Usage: `$url [anilist username]`')
    }
  }
}