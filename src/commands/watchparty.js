const Discord = require('discord.js')
const fs = require('fs')
const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const path = require('path')

module.exports = {
  name: 'watchparty',
  aliases: ['wp'],
	usage: '\nadd [discord username] <anilist username> \nremove <anilist username>',
  description: 'Add or remove members, or show progress of all members of currently set anime.',
  async execute(msg, args) {
    let aliasjson = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
    let allAliases = JSON.parse(aliasjson)
    let serversjson = fs.readFileSync(path.resolve(__dirname, '../data/party.json'), 'utf-8')
    let allServers = JSON.parse(serversjson)
    const serverId = msg.guild.id

    let aliasIndex = allAliases.findIndex(x => Object.keys(x)[0] === serverId)
    let serverIndex = allServers.findIndex(x => Object.keys(x)[0] === serverId)
    if (serverIndex === -1) {
      const newServer = {}
      newServer[serverId] = {
        'current': 'Attack on Titan',
        'list': {}
      }
      allServers.push(newServer)
    }
    serverIndex = allServers.findIndex(x => Object.keys(x)[0] === serverId)

    let thisServer = allServers[serverIndex][serverId]
    let list = thisServer['list']
    
    const currentAnime = await request('https://graphql.anilist.co', GET_MEDIA, {search: thisServer['current']})
    const currentId = currentAnime.Media.id
    let animeIndex = list[currentId]
    if (!animeIndex) {
      const newAnime = []
      list[currentId] = newAnime
    }

    if (args[0] === 'add') {
      let name
      if (args[1].startsWith('<')) {
        let thisServerAliases = allAliases[aliasIndex][serverId]
        name = thisServerAliases[args[1]]
        list[currentId].push(name)
        if (!name) {
          msg.reply('This user has not been aliased. `$help alias`')
        } else {
          serversjson = JSON.stringify(allServers)
          fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
          msg.reply(`Added ${args[1]} to the watch-party.`)
        }
      } else {
        list[currentId].push(args[1])
        serversjson = JSON.stringify(allServers)
        fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
        msg.reply(`Added ${args[1]} to the watch-party.`)
      }
    } else if (args[0] === 'remove') {
      const indexToRemove = list[currentId].findIndex(x => args[1].toLowerCase() === x.toLowerCase())
      if (indexToRemove > -1) {
        list[currentId].splice(indexToRemove, 1)
        serversjson = JSON.stringify(allServers)
        fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
        msg.reply(`${args[1]} has been removed from the watch-party.`)
      } else {
        msg.reply(`${args[1]} is not in this watch-party.`)
      }
    } else {
      try {
        const embed = new Discord.MessageEmbed()
          .setColor(currentAnime.Media.coverImage.color)
          .setTitle('Watch Party')
          .setDescription(`Progress on [**${currentAnime.Media.title.romaji}**](${currentAnime.Media.siteUrl})`)
          .setThumbnail(currentAnime.Media.coverImage.large)
          .setFooter(`requested by ${msg.author.username}`, `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`)
          .setTimestamp()
        
        list[currentId].forEach(async x => {
          const user = await request('https://graphql.anilist.co', GET_USERINFO, {name: x})
          try {
            const list = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: user.User.name, mediaId: currentAnime.Media.id})
            const episodes = list.MediaList.progress
            embed.addField(user.User.name, `[${episodes}/${currentAnime.Media.episodes}](${user.User.siteUrl})`, true)
          } catch {
            const episodes = 0
            embed.addField(user.User.name, `[${episodes}/${currentAnime.Media.episodes}](${user.User.siteUrl})`, true)
          }
        }) 
        
      await msg.delete({ timeout: 2000 })
      msg.reply(embed)
      } catch (err) {
        console.error(err)
        msg.reply('Usage: \n`$watchparty\nadd <anilist username> [discord username] \nremove <anilist username> \n<anime title>`')
      }
    } 
  }
}