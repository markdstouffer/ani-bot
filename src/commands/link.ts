// import types
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, Message, SlashCommandBuilder } from 'discord.js'
import { authenticate } from '../requests/anilist'
import { AniUser, Viewer } from '../types'

const { GraphQLClient } = require('graphql-request')
const client = new GraphQLClient('https://graphql.anilist.co')
const { GET_USERINFO } = require('../queries')

const conn = require('../connections/anidata_conn')
const Alias = conn.models.Alias

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your AniList to your Discord.'),
  async execute (interaction: CommandInteraction) {
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Link your AniList')
          .setURL(`https://anilist.co/api/v2/oauth/authorize?client_id=${process.env.ANI_CLIENT}&response_type=token`)
          .setStyle(ButtonStyle.Link)
      )
    interaction.reply({ content: 'Check DMs!', ephemeral: true })
    const reply = await interaction.user.send({ content: 'Click the button below and follow the link to the AniList authentication page. Follow the prompts to log-in if necessary, and then copy the long code. Paste the code you received here!', components: [row] })

    const filter = async (m: Message) => {
      const token = m.content
      const user: Viewer = await authenticate(token, m.author.id)
      const userInfo: AniUser = await client.request(GET_USERINFO, { name: user.name })
      m.reply('Success! Your token will be encrypted and securely stored so that you can execute AniList-authenticated actions through Discord! Feel free to delete your token from this chat.')
      const embed = new EmbedBuilder()
        .setDescription(`<@${interaction.user.id}> just linked their account to AniList user [**${user.name}**](${userInfo.User.siteUrl})!`)
      interaction.followUp({ embeds: [embed] })

      // ADD/EDIT ALIAS
      const query = { 'server.serverId': interaction.guildId }
      const countServerDocs: number = await Alias.find(query).limit(1).countDocuments()
      if (countServerDocs === 0) {
        const newServer = new Alias({
          server: {
            serverId: interaction.guildId,
            users: []
          }
        })
        await newServer.save()
      }
      const newUser = {
        username: user.name,
        userId: `<@!${interaction.user.id}>`
      }
      const eraseOld = { userId: `<@!${interaction.user.id}>` }
      await Alias.findOneAndUpdate(query, { $pull: { 'server.users': eraseOld } })
      await Alias.findOneAndUpdate(query, { $push: { 'server.users': newUser } }, { new: true })

      return token.length > 50
    }
    reply.channel.awaitMessages({ filter, max: 1, time: 180000, errors: ['time'] })
  }
}
