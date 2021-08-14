const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const { SlashCommandBuilder } = require('@discordjs/builders')
const Discord = require('discord.js')
const wait = require('util').promisify(setTimeout)

const conn = require('../connections/anidata_conn')
const Alias = conn.models.Alias

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rating')
    .setDescription('Returns a user\'s rating of an anime.')
    .addSubcommand(sub =>
      sub
        .setName('all')
        .setDescription('Returns all aliased server members ratings for an anime')
        .addStringOption(opt =>
          opt
            .setName('title')
            .setDescription('Anime title')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('user')
        .setDescription('Returns rating of one user')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('AniList username or Discord tag')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('title')
            .setDescription('Anime title')
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    function percentToHex(percent, start, end, s, l) {
      l /= 100
      const x = (percent / 100), y = (end - start) * x,
        h = y + start
      const a = s * Math.min(l, 1 - l) / 100;
      const f = n => {
        const k = (n + h / 30) % 12
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
        return Math.round(255 * color).toString(16).padStart(2, '0')
      }
      return `#${f(0)}${f(8)}${f(4)}`
    } //function to convert percent to HEX (adapted from u/icl7126, u/Mattisdada)

    const serverId = interaction.guildId
    const countServerDocs = await Alias.find({ 'server.serverId': serverId }).limit(1).countDocuments()
    let serverExists = (countServerDocs > 0)
    let serverAliases = await Alias.findOne({ 'server.serverId': serverId })

    const sub = interaction.options.getSubcommand()
    const name = interaction.options.getString('name')
    const title = interaction.options.getString('title')

    try {
      const animeData = await request('https://graphql.anilist.co', GET_MEDIA, { search: title })

      if (sub === 'all') {
        if (serverExists) {
          interaction.deferReply()
          const userList = serverAliases.server.users
  
          const allEmbed = new Discord.MessageEmbed()
            .setTitle('Ratings')
            .setDescription(`Server members' ratings for [**${animeData.Media.title.romaji}**](${animeData.Media.siteUrl})`)
            .setThumbnail(animeData.Media.coverImage.large)
            .setFooter(`requested by ${interaction.user.username}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
            .setTimestamp()
          let countRating = 0, count = 0
          userList.forEach(async u => {
            const user = await request('https://graphql.anilist.co', GET_USERINFO, { name: u.username })
            try {
              const oneList = await request('https://graphql.anilist.co', GET_MEDIALIST, { userName: user.User.name, mediaId: animeData.Media.id })
              const userRating = oneList.MediaList.score
              countRating += userRating
              count += 1
              allEmbed.addField(user.User.name, `[${userRating}/10](${user.User.siteUrl})`, true)
            } catch {
              const userRating = 'N/A'
              allEmbed.addField(user.User.name, `[${userRating}](${user.User.siteUrl})`, true)
            }
          })
          await wait(1000)
  
          const avgScore = (count !== 0) ? countRating / count : 0
          const color = percentToHex(avgScore * 10, 0, 110, 100, 50)
          allEmbed.setColor(color)
  
          interaction.editReply({ embeds: [allEmbed] })
        } else {
          interaction.reply('You must alias at least one user first. `/alias add`')
        }
      }

      else if (name.startsWith('<')) {
        if (serverExists) {
          const userList = serverAliases.server.users
          const user = userList.find(x => x.userId === name)
          if (user) {
            const userData = await request('https://graphql.anilist.co', GET_USERINFO, { name: user.username })
            try {
              const listData = await request('https://graphql.anilist.co', GET_MEDIALIST, { userName: userData.User.name, mediaId: animeData.Media.id })
              const score = listData.MediaList.score * 10
              const color = percentToHex(score, 0, 110, 100, 50)
              const embed = new Discord.MessageEmbed()
                .setColor(color)
                .setThumbnail(animeData.Media.coverImage.large)
                .setDescription(`[**${animeData.Media.title.romaji}**](${animeData.Media.siteUrl})`)
                .setTitle(userData.User.name)
                .addField('Score:', `${score / 10}/10`)
              interaction.reply({ embeds: [embed] })
            } catch {
              interaction.reply(`${userData.User.name} has not yet rated this anime.`)
            }
          } else {
            interaction.reply('This user has not yet been aliased to an Anilist user. `/alias add`')
          }
        } else {
          interaction.reply('This user has not yet been aliased to an Anilist user. `/alias add`')
        }
      }
      else {
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, { name })
        try {
          const listData = await request('https://graphql.anilist.co', GET_MEDIALIST, { userName: userData.User.name, mediaId: animeData.Media.id })
          const score = listData.MediaList.score * 10
          const color = percentToHex(score, 0, 110, 100, 50)
          const embed = new Discord.MessageEmbed()
            .setColor(color)
            .setThumbnail(animeData.Media.coverImage.large)
            .setDescription(`[**${animeData.Media.title.romaji}**](${animeData.Media.siteUrl})`)
            .setTitle(userData.User.name)
            .addField('Score:', `${score / 10}/10`)
          interaction.reply({ embeds: [embed] })
        } catch {
          interaction.reply(`${userData.User.name} has not yet rated this anime.`)
        }
      }

    } catch (err) {
      console.log('User failed to use /score')
      console.error(err)
      interaction.reply({ content: 'Command failed', ephemeral: true })
    }
  }
}