const Discord = require('discord.js')
const { request } = require('graphql-request')
const { GET_MEDIA } = require('../queries')

module.exports = {
  name: 'anime',
  aliases: ['search', 'ani'],
  description: 'Returns information on a search anime',
  async execute(msg, args) {
    const title = args.splice(0, args.length).join(' ')
    const media = await request('https://graphql.anilist.co', GET_MEDIA, {search: title})
    console.log(media.Media)
    const embed = new Discord.MessageEmbed()
      .setColor(media.Media.coverImage.color)
      .setDescription(`${media.Media.title.romaji} on [**Anilist**](${media.Media.siteUrl})`)
      .setTitle(media.Media.title.romaji)
      .setThumbnail(media.Media.coverImage.large)
      .addField('Avg. score: ', `${media.Media.averageScore}\%`, true)
      .addField('# of episodes: ', media.Media.episodes, true)
      .addField('Status: ', `\`${media.Media.status}\``, true)
      .setFooter(`requested by ${msg.author.username}`, `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`)
      .setTimestamp()
      media.Media.genres[1]
        ? embed.addField('Genres: ', `${media.Media.genres[0]}, ${media.Media.genres[1]}`, true)
        : embed.addField('Genre: ', `${media.Media.genres[0]}`, true)
      media.Media.streamingEpisodes[0] 
        ? embed.addField('Streaming: ', `[${media.Media.streamingEpisodes[0].site}](${media.Media.streamingEpisodes[0].url})`, true)
        : embed.addField('Streaming: ', `Unavailable :(`, true)

    msg.reply(embed)
  }
}