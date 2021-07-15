const Discord = require('discord.js')
const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const { users } = require('../members')

module.exports = {
  name: 'watchparty',
  aliases: ['wp'],
	usage: '[anime title]',
  description: 'Returns the progress of each watch-party member on a given anime.',
  async execute(msg, args) {
    const title = args.splice(0, args.length).join(' ')
    const idData = await request('https://graphql.anilist.co', GET_MEDIA, {search: title})
    const embed = new Discord.MessageEmbed()
      .setTitle('Watch Party')
      .setDescription(`Progress on ${idData.Media.title.romaji}`)
      .setThumbnail(idData.Media.coverImage.large)
    
    for (i = 0; i < users.length; i++) {
      const user = await request('https://graphql.anilist.co', GET_USERINFO, {name: users[i].username})
      try {
        const list = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: user.User.name, mediaId: idData.Media.id})
        const episodes = list.MediaList.progress
        embed.addField(user.User.name, `${episodes}/${idData.Media.episodes}`, true)
      } catch {
        const episodes = 0
        embed.addField(user.User.name, `${episodes}/${idData.Media.episodes}`, true)
      }
    }

    msg.reply(embed)
  }
}