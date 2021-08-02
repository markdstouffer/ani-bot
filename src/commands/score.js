const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const Discord = require('discord.js')
const path = require('path')
const fs = require('fs')

module.exports = {
  name: 'score',
  aliases: ['rating'],
  description: 'Returns the score given to an anime, given a username and an anime title.',
	usage: '\n{anilist username | discord tag} <anime title>\nall <anime title>',
  async execute(msg, args) {
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
          .setTitle('Ratings')
          .setDescription(`Server members' ratings for [**${animeData.Media.title.romaji}**](${animeData.Media.siteUrl})`)
          .setThumbnail(animeData.Media.coverImage.large)
          .setFooter(`requested by ${msg.author.username}`, `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`)
          .setTimestamp()
        let countRating = 0, count = 0
          for (const [key, value] of Object.entries(thisServerAliases)) {
            const user = await request('https://graphql.anilist.co', GET_USERINFO, {name: value})
            try {
              const oneList = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: user.User.name, mediaId: animeData.Media.id})
              const userRating = oneList.MediaList.score
              countRating += userRating
              count += 1
              allEmbed.addField(user.User.name, `[${userRating}/10](${user.User.siteUrl})`, true)
              } catch {
                const userRating = 'N/A'
                allEmbed.addField(user.User.name, `[${userRating}](${user.User.siteUrl})`, true)
              }
            }
        const avgScore = (count !== 0) ? countRating/count : 0
        const color = percentToHex(avgScore*10, 0, 110, 100, 50)
        allEmbed.setColor(color)
        setTimeout(() => msg.delete(), 2000)
        await setTimeout(() => msg.channel.send({embeds: [allEmbed]}), 500)
      }

       else if (args[0].startsWith('<')) {
        const modArray = allAliases[allAliases.findIndex((x) => Object.keys(x)[0] === msg.guild.id)][msg.guild.id]
        const username = modArray[args[0]]
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: username})
        try {
          const listData = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: userData.User.name, mediaId: animeData.Media.id})
          const score = listData.MediaList.score * 10
          const color = percentToHex(score, 0, 110, 100, 50)
          const embed = new Discord.MessageEmbed()
            .setColor(color)
            .setThumbnail(animeData.Media.coverImage.large)
            .setDescription(`[**${animeData.Media.title.romaji}**](${animeData.Media.siteUrl})`)
            .setTitle(userData.User.name)
            .addField('Score:', `${score/10}/10`)
          msg.reply({ embeds: [embed] })
        } catch {
          msg.reply(`${userData.User.name} has not yet rated this anime.`)
        }
      }
      else {
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: args[0]})
        try {
          const listData = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: userData.User.name, mediaId: animeData.Media.id})
          const score = listData.MediaList.score * 10
          const color = percentToHex(score, 0, 110, 100, 50)
          const embed = new Discord.MessageEmbed()
            .setColor(color)
            .setThumbnail(animeData.Media.coverImage.large)
            .setDescription(`[**${animeData.Media.title.romaji}**](${animeData.Media.siteUrl})`)
            .setTitle(userData.User.name)
            .addField('Score:', `${score/10}/10`)
          msg.reply({ embeds: [embed] })
        } catch {
          msg.reply(`${userData.User.name} has not yet rated this anime.`)
        }
    }
    
    } catch (err) {
      console.log('User failed to use $score, sent usage help.')
      console.error(err) 
      msg.reply('Usage: \n`$score {anilist username | discord tag} <anime title>`\n`$score all <anime title>')
    }
  }
}