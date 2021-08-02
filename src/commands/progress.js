const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const path = require('path')
const Discord = require('discord.js')
const fs = require('fs')

module.exports = {
  name: 'progress',
  description: 'Returns how many episodes of an anime a user has watched, given a username and an anime title.',
  usage: '\n{anilist username | discord tag} <anime title>\nall <anime title>',
  async execute(msg, args) {
    let aliasjson = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
    let allAliases = JSON.parse(aliasjson)
    const serverId = msg.guild.id
    const aliasIndex = allAliases.findIndex(x => Object.keys(x)[0] === serverId)
    let thisServerAliases = allAliases[aliasIndex][serverId]
    const title = args.splice(1, args.length).join(' ')
    try {
        const animeData = await request('https://graphql.anilist.co', GET_MEDIA, {search: title})
        if (args[0] === 'all') {
          const allEmbed = new Discord.MessageEmbed()
            .setColor(animeData.Media.coverImage.color)
            .setTitle('Progress')
            .setDescription(`Server members' progress on [**${animeData.Media.title.romaji}**](${animeData.Media.siteUrl})`)
            .setThumbnail(animeData.Media.coverImage.large)
            .setFooter(`requested by ${msg.author.username}`, `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`)
            .setTimestamp()
    
          for (const [key, value] of Object.entries(thisServerAliases)) {
            const user = await request('https://graphql.anilist.co', GET_USERINFO, {name: value})
            try {
              const oneList = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: user.User.name, mediaId: animeData.Media.id})
              const oneEpisodes = oneList.MediaList.progress
              allEmbed.addField(user.User.name, `[${oneEpisodes}/${animeData.Media.episodes}](${user.User.siteUrl})`, true)
              } catch {
                const oneEpisodes = 0
                allEmbed.addField(user.User.name, `[${oneEpisodes}/${animeData.Media.episodes}](${user.User.siteUrl})`, true)
              }
            }
          msg.channel.sendTyping()
          setTimeout(() => msg.delete(), 1000)
          await setTimeout(() => msg.channel.send({ embeds: [allEmbed] }), 500)
        } 
        else {
            if (args[0].startsWith('<')) {
              const modArray = allAliases[allAliases.findIndex((x) => Object.keys(x)[0] === msg.guild.id)][msg.guild.id]
              const username = modArray[args[0]]
              const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: username})
              try {
                const listData = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: userData.User.name, mediaId: animeData.Media.id})
                const stat =
                  (listData.MediaList.status === 'CURRENT') ? 'Currently watching':
                  (listData.MediaList.status === 'COMPLETED') ? 'Completed watching':
                  (listData.MediaList.status === 'DROPPED') ? 'Dropped watching':
                  (listData.MediaList.status === 'PAUSED') ? 'Paused watching' : null
                const embed = new Discord.MessageEmbed()
                  .setTitle(userData.User.name)
                  .setColor(animeData.Media.coverImage.color)
                  .setThumbnail(animeData.Media.coverImage.large)
                  .setDescription(`Progress on [**${animeData.Media.title.romaji}**](${animeData.Media.siteUrl})`)
                  .addField(stat, `${listData.MediaList.progress}/${animeData.Media.episodes}`)
                msg.reply({ embeds: [embed] })
              } catch {
                msg.reply(`${userData.User.name} has not yet watched any episodes of this anime.`)
              }
            }
            else {
              const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: args[0]})
              try {
                const listData = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: userData.User.name, mediaId: animeData.Media.id})
                const stat =
                  (listData.MediaList.status === 'CURRENT') ? 'Currently watching':
                  (listData.MediaList.status === 'COMPLETED') ? 'Completed watching':
                  (listData.MediaList.status === 'DROPPED') ? 'Dropped watching':
                  (listData.MediaList.status === 'PAUSED') ? 'Paused watching' : null
                const embed = new Discord.MessageEmbed()
                  .setTitle(userData.User.name)
                  .setColor(animeData.Media.coverImage.color)
                  .setThumbnail(animeData.Media.coverImage.large)
                  .setDescription(`Progress on [**${animeData.Media.title.romaji}**](${animeData.Media.siteUrl})`)
                  .addField(stat, `${listData.MediaList.progress}/${animeData.Media.episodes}`)
                msg.reply({ embeds: [embed] })
              } catch {
                msg.reply(`${userData.User.name} has not yet watched any episodes of this anime.`)
              }
            }
      
          }
    } catch (err) {
      console.log('User failed to use $progress, sent usage help.')
      console.error(err)
      msg.reply('Usage: \n`$progress {anilist username | discord tag} <anime title>`\n`$progress all <anime title>`')
    }
    }
  }
