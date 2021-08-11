const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const { SlashCommandBuilder } = require('@discordjs/builders')
const path = require('path')
const Discord = require('discord.js')
const fs = require('fs')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress')
    .setDescription('Returns how many episodes of an anime a user has watched.')
    .addSubcommand(sub =>
      sub
        .setName('all')
        .setDescription('Get progress for all aliased members in the server')
        .addStringOption(opt =>
          opt
            .setName('anime')
            .setDescription('Anime title')
            .setRequired(true)
          )
      )
    .addSubcommand(sub =>
      sub
        .setName('user')
        .setDescription('Get progress for one user')
        .addStringOption(opt =>
          opt
            .setName('user')
            .setDescription('AniList username')
            .setRequired(true)
          )
        .addStringOption(opt =>
          opt
            .setName('anime')
            .setDescription('Anime title')
            .setRequired(true)
          )
      ),
  async execute(interaction) {
    let aliasjson = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
    let allAliases = JSON.parse(aliasjson)
    const serverId = interaction.guildId
    const aliasIndex = allAliases.findIndex(x => Object.keys(x)[0] === serverId)
    let thisServerAliases = allAliases[aliasIndex][serverId]
    const sub = interaction.options.getSubcommand()
    const title = interaction.options.getString('anime')
    const user = interaction.options.getString('user')
    try {
        const animeData = await request('https://graphql.anilist.co', GET_MEDIA, {search: title})
        if (sub === 'all') {
          const allEmbed = new Discord.MessageEmbed()
            .setColor(animeData.Media.coverImage.color)
            .setTitle('Progress')
            .setDescription(`Server members' progress on [**${animeData.Media.title.romaji}**](${animeData.Media.siteUrl})`)
            .setThumbnail(animeData.Media.coverImage.large)
            .setFooter(`requested by ${interaction.user.username}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
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
          // msg.channel.sendTyping()
          // setTimeout(() => msg.delete(), 1000)
          await setTimeout(() => interaction.reply({ embeds: [allEmbed] }), 500)
        } 
        else {
            if (user.startsWith('<')) {
              const modArray = allAliases[allAliases.findIndex((x) => Object.keys(x)[0] === serverId)][serverId]
              const username = modArray[user]
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
                interaction.reply({ embeds: [embed] })
              } catch {
                interaction.reply(`${userData.User.name} has not yet watched any episodes of this anime.`)
              }
            }
            else {
              const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: user})
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
                interaction.reply({ embeds: [embed] })
              } catch {
                interaction.reply(`${userData.User.name} has not yet watched any episodes of this anime.`)
              }
            }
      
          }
    } catch (err) {
      console.log('User failed to use $progress, sent usage help.')
      console.error(err)
      interaction.reply('Usage: \n`$progress {anilist username | discord tag} <anime title>`\n`$progress all <anime title>`')
    }
    }
  }
