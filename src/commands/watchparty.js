const Discord = require('discord.js')
const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const { names } = require('../members')

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
    
    //this code is garbage and i will one day make it better
    
    //0 (0-5)
    const user0 = await request('https://graphql.anilist.co', GET_USERINFO, {name: names[0]})
    try {
      const list0 = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: user0.User.name, mediaId: idData.Media.id})
      const episodes0 = list0.MediaList.progress
      embed.addField(user0.User.name, episodes0, true)
    } catch {
      const episodes0 = 0
      embed.addField(user0.User.name, episodes0, true)
    }
    //1 (0-5)
    const user1 = await request('https://graphql.anilist.co', GET_USERINFO, {name: names[1]})
    try {
      const list1 = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: user1.User.name, mediaId: idData.Media.id})
      const episodes1 = list1.MediaList.progress
      embed.addField(user1.User.name, episodes1, true)
    } catch {
      const episodes1 = 0
      embed.addField(user1.User.name, episodes1, true)
    }
    //2 (0-5)
    const user2 = await request('https://graphql.anilist.co', GET_USERINFO, {name: names[2]})
    try {
      const list2 = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: user2.User.name, mediaId: idData.Media.id})
      const episodes2 = list2.MediaList.progress
      embed.addField(user2.User.name, episodes2, true)
    } catch {
      const episodes2 = 0
      embed.addField(user2.User.name, episodes2, true)
    }
    //3 (0-5)
    const user3 = await request('https://graphql.anilist.co', GET_USERINFO, {name: names[3]})
    try {
      const list3 = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: user3.User.name, mediaId: idData.Media.id})
      const episodes3 = list3.MediaList.progress
      embed.addField(user3.User.name, episodes3, true)
    } catch {
      const episodes3 = 0
      embed.addField(user3.User.name, episodes3, true)
    }
    //4 (0-5)
    const user4 = await request('https://graphql.anilist.co', GET_USERINFO, {name: names[4]})
    try {
      const list4 = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: user4.User.name, mediaId: idData.Media.id})
      const episodes4 = list4.MediaList.progress
      embed.addField(user4.User.name, episodes4, true)
    } catch {
      const episodes4 = 0
      embed.addField(user4.User.name, episodes4, true)
    }
    //5 (0-5)
    const user5 = await request('https://graphql.anilist.co', GET_USERINFO, {name: names[5]})
    try {
      const list5 = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: user5.User.name, mediaId: idData.Media.id})
      const episodes5 = list5.MediaList.progress
      embed.addField(user5.User.name, episodes5, true)
    } catch {
      const episodes5 = 0
      embed.addField(user5.User.name, episodes5, true)
    }
    msg.reply(embed)
  }
}