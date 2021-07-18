const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const Discord = require('discord.js')
const path = require('path')
const fs = require('fs')

module.exports = {
  name: 'score',
  aliases: ['rating'],
  description: 'Returns the score given to an anime, given a username and an anime title.',
	usage: '{anilist username | discord tag} <anime title>',
  async execute(msg, args) {
    let usersjson = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
    let usersArray = JSON.parse(usersjson)
    function percentToHex(percent, start, end, s, l) {
      l /= 100
      const x = (percent/100), y = (end-start) * x, 
        h = y + start
      const a = s * Math.min(l, 1 - l) / 100;
      const f = n => {
        const k = (n + h / 30) % 12
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
        return Math.round(255 * color).toString(16).padStart(2, '0')
      }
      return `#${f(0)}${f(8)}${f(4)}`
    } //function to convert percent to HEX (adapted from u/icl7126, u/Mattisdada)
    try {
      const title = args.splice(1, args.length).join(' ')
      const idData = await request('https://graphql.anilist.co', GET_MEDIA, {search: title})
      if (args[0].startsWith('<')) {
        const modArray = usersArray[usersArray.findIndex((x) => Object.keys(x)[0] === msg.guild.id)][msg.guild.id]
        const username = modArray[args[0]]
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: username})
        try {
          const listData = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: userData.User.name, mediaId: idData.Media.id})
          const score = listData.MediaList.score * 10
          const color = percentToHex(score, 0, 110, 100, 50)
          const embed = new Discord.MessageEmbed()
            .setColor(color)
            .setThumbnail(idData.Media.coverImage.large)
            .setDescription(`[**${idData.Media.title.romaji}**](${idData.Media.siteUrl})`)
            .setTitle(userData.User.name)
            .addField('Score:', `${score/10}/10`)
          msg.reply(embed)
        } catch {
          msg.reply(`${userData.User.name} has not yet rated this anime.`)
        }
      }
      else {
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: args[0]})
        try {
          const listData = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: userData.User.name, mediaId: idData.Media.id})
          const score = listData.MediaList.score * 10
          const color = percentToHex(score, 0, 110, 100, 50)
          console.log(color)
          const embed = new Discord.MessageEmbed()
            .setColor(color)
            .setThumbnail(idData.Media.coverImage.large)
            .setDescription(`[**${idData.Media.title.romaji}**](${idData.Media.siteUrl})`)
            .setTitle(userData.User.name)
            .addField('Score:', `${score/10}/10`)
          msg.reply(embed)
        } catch {
          msg.reply(`${userData.User.name} has not yet rated this anime.`)
        }
    }
    
    } catch (err) {
      console.error(err) 
      msg.reply('Usage: `$score {anilist username | discord tag} <anime title>`')
    }
  }
}