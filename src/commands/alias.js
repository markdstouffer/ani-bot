const { SlashCommandBuilder } = require('@discordjs/builders')

const conn = require('../connections/anidata_conn')
const Alias = conn.models.Alias

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alias')
    .setDescription('Link a Discord tag to an AniList username')
    .addSubcommand(subcommand =>
      subcommand
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
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove alias from a Discord user')
        .addMentionableOption(option =>
          option
            .setName('discord')
            .setDescription('Discord tag')
            .setRequired(true)
          )
      ),
  async execute(interaction) {
    const serverId = interaction.guildId
    const discord = `<@!${interaction.options.getMentionable('discord').user.id}>`
    const anilist = interaction.options.getString('anilist')
    const query = { 'server.serverId': serverId }
    const sub = interaction.options.getSubcommand()

    const countServerDocs = await Alias.find({ 'server.serverId': serverId }).limit(1).countDocuments()
    let serverExists = (countServerDocs > 0)

    if (!serverExists) {
      const newServer = new Alias({
        server: {
          serverId: serverId,
          users: []
        }
      })
      await newServer.save()
    }

    if (sub === 'add') {
      const newUser = {
        username: anilist,
        userId: discord
      }
      const eraseOld = { userId: discord }
      await Alias.findOneAndUpdate(query, { $pull: { 'server.users': eraseOld } })
      let changedDoc = await Alias.findOneAndUpdate(query, { $push: { 'server.users': newUser } }, { new: true })
      interaction.reply(`Aliased ${discord} to ${anilist}`)
    } else if (sub === 'remove') {
      const userToRemove = {
        userId: discord
      }
      let changedDoc = await Alias.findOneAndUpdate(query, { $pull: { 'server.users': userToRemove } })
      console.log(changedDoc)
      interaction.reply(`Removed ${discord}'s alias`)
    }
  }
}
