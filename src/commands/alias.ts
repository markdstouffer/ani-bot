// allows users to link their Discord account with an AniList account -
// - without needing to authenticate with AniList.
// does not enable mutation requests

// import types
import { SlashCommandSubcommandBuilder } from '@discordjs/builders'
import { CommandInteraction, User } from 'discord.js'

const { SlashCommandBuilder } = require('@discordjs/builders')

const conn = require('../connections/anidata_conn')
const Alias = conn.models.Alias

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alias')
    .setDescription('Link a Discord tag to an AniList username')
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('add')
        .setDescription('Add an alias, or edit an existing one')
        .addMentionableOption(option =>
          option
            .setName('discord')
            .setDescription('Discord tag')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('anilist')
            .setDescription('AniList username')
            .setRequired(true)
        )
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('remove')
        .setDescription('Remove alias from a Discord user')
        .addMentionableOption(option =>
          option
            .setName('discord')
            .setDescription('Discord tag')
            .setRequired(true)
        )
    ),
  async execute (interaction: CommandInteraction) {
    const serverId = interaction.guildId
    const mentionable: User = interaction.options.getMentionable('discord') as User
    const discord = `<@!${mentionable!.id}>`
    const anilist = interaction.options.getString('anilist')
    const query = { 'server.serverId': serverId }
    const sub = interaction.options.getSubcommand()

    const countServerDocs: number = await Alias.find({ 'server.serverId': serverId }).limit(1).countDocuments()
    const serverExists = (countServerDocs > 0)

    if (!serverExists) { // guild not saved in DB
      const newServer = new Alias({
        server: {
          serverId: serverId,
          users: []
        }
      })
      await newServer.save()
    }

    if (sub === 'add') { // add (also functions as update) alias
      const newUser = {
        username: anilist,
        userId: discord
      }
      const eraseOld = { userId: discord }
      await Alias.findOneAndUpdate(query, { $pull: { 'server.users': eraseOld } }) // ignores if eraseOld doesn't exist in DB
      await Alias.findOneAndUpdate(query, { $push: { 'server.users': newUser } }, { new: true })
      console.log(`${interaction.user.username} added/edited alias for ${newUser.userId}`)
      interaction.reply({ content: `Aliased ${discord} to ${anilist}`, ephemeral: true })
    } else if (sub === 'remove') { // remove alias
      const userToRemove = {
        userId: discord
      }
      console.log(`${interaction.user.username} removed alias for ${userToRemove.userId}`)
      await Alias.findOneAndUpdate(query, { $pull: { 'server.users': userToRemove } })
      interaction.reply({ content: `Removed ${discord}'s alias`, ephemeral: true })
    }
  }
}
