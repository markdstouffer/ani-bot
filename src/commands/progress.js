const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const path = require('path')
const Discord = require('discord.js')
const fs = require('fs')

module.exports = {
  name: 'progress',
  description: 'Returns how many episodes of an anime a user has watched, given a username and an anime title.',
	usage: '{anilist username | discord tag} <anime title>',
  async execute(msg, args) {
    let usersjson = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
    let usersArray = JSON.parse(usersjson)
    try {
      const title = args.splice(1, args.length).join(' ')
      const idData = await request('https://graphql.anilist.co', GET_MEDIA, {search: title})
      if (args[0].startsWith('<')) {
        const modArray = usersArray[usersArray.findIndex((x) => Object.keys(x)[0] === msg.guild.id)][msg.guild.id]
        const username = modArray[args[0]]
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: username})
        try {
          const listData = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: userData.User.name, mediaId: idData.Media.id})
          const stat = 
            (listData.MediaList.status === 'CURRENT') ? 'Currently watching': 
            (listData.MediaList.status === 'COMPLETED') ? 'Completed watching':
            (listData.MediaList.status === 'DROPPED') ? 'Dropped watching':
            (listData.MediaList.status === 'PAUSED') ? 'Paused watching' : null
          const embed = new Discord.MessageEmbed()
            .setTitle(userData.User.name)
            .setColor(idData.Media.coverImage.color)
            .setThumbnail(idData.Media.coverImage.large)
            .setDescription(`Progress on [**${idData.Media.title.romaji}**](${idData.Media.siteUrl})`)
            .addField(stat, `${listData.MediaList.progress}/${idData.Media.episodes}`)
          msg.reply(embed)
        } catch {
          msg.reply(`${userData.User.name} has not yet watched any episodes of this anime.`)
        }
      }
      else {
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: args[0]})
        try {
          const listData = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: userData.User.name, mediaId: idData.Media.id})
          const stat = 
            (listData.MediaList.status === 'CURRENT') ? 'Currently watching': 
            (listData.MediaList.status === 'COMPLETED') ? 'Completed watching':
            (listData.MediaList.status === 'DROPPED') ? 'Dropped watching':
            (listData.MediaList.status === 'PAUSED') ? 'Paused watching' : null
          const embed = new Discord.MessageEmbed()
            .setTitle(userData.User.name)
            .setColor(idData.Media.coverImage.color)
            .setThumbnail(idData.Media.coverImage.large)
            .setDescription(`Progress on [**${idData.Media.title.romaji}**](${idData.Media.siteUrl})`)
            .addField(stat, `${listData.MediaList.progress}/${idData.Media.episodes}`)
          msg.reply(embed)
        } catch {
          msg.reply(`${userData.User.name} has not yet watched any episodes of this anime.`)
        }
    }
    
    } catch (err) {
      console.error(err) 
      msg.reply('Usage: `$progress [anilist username] [anime title]`')
    }
  }
}