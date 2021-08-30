// import types
import { CommandInteraction } from 'discord.js'
import { removeAuthentication, isAuthenticated, getAuthUser } from '../requests/anilist'

const { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink your AniList from your Discord.'),
  async execute (interaction: CommandInteraction) {
    const discord = interaction.user.id
    if (await isAuthenticated(discord)) {
      const auth = await getAuthUser(discord)
      const anilist = auth.username
      await removeAuthentication(discord)
      interaction.reply({ content: `You are no longer logged in as ${anilist}.`, ephemeral: true })
    } else {
      interaction.reply({ content: 'You aren\'t currently logged in as any AniList user.' })
    }
  }
}
