const Discord = require('discord.js')
const fs = require('fs')
const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const path = require('path')

module.exports = {
  name: 'watchparty',
  aliases: ['wp'],
	usage: '\nadd [discord username] <anilist username> \nremove <anilist username> \n<anime title>',
  description: 'Add or remove members, or show progress of all members on given anime.',
  async execute(msg, args) {
    const title = args.slice().splice(0, args.length).join(' ')
    let partyjson = fs.readFileSync(path.resolve(__dirname, '../data/party.json'), 'utf-8')
    let allPartyArray = JSON.parse(partyjson)
    const server = msg.guild.id

    let ind = allPartyArray.findIndex(x => Object.keys(x)[0] === server)
    if (ind === -1) {
      const newServer = {}
      newServer[server] = {}
      allPartyArray.push(newServer)
    }
    ind = allPartyArray.findIndex(x => Object.keys(x)[0] === server)

    let serverPartyArray = allPartyArray[ind][server]

    if (args[0] === 'add') {
      if (args[2]) {
        serverPartyArray[args[1]] = args[2]
      } else {
        serverPartyArray[Object.keys(serverPartyArray).length] = args[1]
      }
      partyjson = JSON.stringify(allPartyArray)
      fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), partyjson, 'utf-8')
      msg.reply(`Added ${args[1]} to the watch-party.`)

    } else if (args[0] === 'remove') {
      delete serverPartyArray[Object.keys(serverPartyArray).find(key => serverPartyArray[key] === args[1])]
      partyjson = JSON.stringify(allPartyArray)
      fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), partyjson, 'utf-8')
      msg.reply(`${args[1]} has been removed from the watch-party.`)
    } else {
      try {
        let partyjson = fs.readFileSync(path.resolve(__dirname, '../data/party.json'), 'utf-8')
        let partyArray = JSON.parse(partyjson)
        const serverPartyArray = partyArray[partyArray.findIndex(x => Object.keys(x)[0] === msg.guild.id)][msg.guild.id]
        const idData = await request('https://graphql.anilist.co', GET_MEDIA, {search: title})
        const embed = new Discord.MessageEmbed()
          .setColor(idData.Media.coverImage.color)
          .setTitle('Watch Party')
          .setDescription(`Progress on [**${idData.Media.title.romaji}**](${idData.Media.siteUrl})`)
          .setThumbnail(idData.Media.coverImage.large)
          .setFooter(`requested by ${msg.author.username}`, `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`)
          .setTimestamp()
        
        for (const [key, value] of Object.entries(serverPartyArray)) {
          const user = await request('https://graphql.anilist.co', GET_USERINFO, {name: value})
          try {
            const list = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: user.User.name, mediaId: idData.Media.id})
            const episodes = list.MediaList.progress
            embed.addField(user.User.name, `[${episodes}/${idData.Media.episodes}](${user.User.siteUrl})`, true)
          } catch {
            const episodes = 0
            embed.addField(user.User.name, `[${episodes}/${idData.Media.episodes}](${user.User.siteUrl})`, true)
          }
        }
      msg.delete({ timeout: 2000 })
      msg.reply(embed)
      } catch (err) {
        console.error(err)
        msg.reply('Usage: \n`$watchparty\nadd <anilist username> [discord username] \nremove <anilist username> \n<anime title>`')
      }
    } 
  }
}