// import types
import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { getAuthUser, isAuthenticated, removeAuthentication } from '../requests/anilist'

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
      await interaction.reply({content: `You are no longer logged in as ${anilist}.`, ephemeral: true})
    } else {
      await interaction.reply({content: 'You aren\'t currently logged in as any AniList user.'})
    }
  }
}
