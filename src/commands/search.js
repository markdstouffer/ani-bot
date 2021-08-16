const Discord = require('discord.js')
const { request } = require('graphql-request')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { GET_MEDIA } = require('../queries')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for an anime')
    .addStringOption(opt =>
      opt
        .setName('title')
        .setDescription('Anime title')
        .setRequired(true)
    ),
  async execute(interaction) {
    const title = interaction.options.getString('title')
    const media = await request('https://graphql.anilist.co', GET_MEDIA, { search: title })
    console.log(media.Media)
    console.log(interaction.channel.nsfw)
    if (media.Media.isAdult && !interaction.channel.nsfw) {
      interaction.reply({ content: `${media.Media.title.romaji} is an adult-themed anime, and this channel does not support NSFW content!`, ephemeral: true })
    } else {
      const embed = new Discord.MessageEmbed()
        .setColor(media.Media.coverImage.color)
        .setDescription(`${media.Media.title.romaji} on [**Anilist**](${media.Media.siteUrl})`)
        .setTitle(media.Media.title.romaji)
        .setThumbnail(media.Media.coverImage.large)
        .addField('Avg. score: ', `${media.Media.averageScore}\%`, true)
        .addField('# of episodes: ', `${media.Media.episodes}`, true)
        .addField('Status: ', `\`${media.Media.status}\``, true)
        .setFooter(`${media.Media.format}, by ${media.Media.studios.nodes[0].name} • ${media.Media.season} ${media.Media.seasonYear}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
      media.Media.genres[1]
        ? embed.addField('Genres: ', `${media.Media.genres[0]}, ${media.Media.genres[1]}`, true)
        : embed.addField('Genre: ', `${media.Media.genres[0]}`, true)
      media.Media.streamingEpisodes[0]
        ? embed.addField('Streaming: ', `[${media.Media.streamingEpisodes[0].site}](${media.Media.streamingEpisodes[0].url})`, true)
        : embed.addField('Streaming: ', `Torrent it!`, true)

      interaction.reply({ embeds: [embed] })
    }
  }
}
