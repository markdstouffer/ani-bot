// import types
import { SlashCommandSubcommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { Parties, Aliases } from '../types'

const Discord = require('discord.js')
const fs = require('fs')
const path = require('path')
const { SlashCommandBuilder } = require('@discordjs/builders')
const subcommands = new Discord.Collection()
const subFiles = fs.readdirSync(path.resolve(__dirname, './subcommands/watchparty')).filter((file: string) => file.endsWith('.ts'))

for (const file of subFiles) {
  const command = require(`./subcommands/watchparty/${file}`)
  subcommands.set(command.data.name, command)
}

const conn = require('../connections/anidata_conn')
const Alias = conn.models.Alias
const Party = conn.models.Party

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wp')
    .setDescription('Anime watch-parties')
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('view')
        .setDescription('View watch-party progress')
        .addStringOption(opt =>
          opt
            .setName('title')
            .setDescription('Anime title')
            .setRequired(true)
        )
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('suggest')
        .setDescription('Suggest a watch-party subject')
        .addStringOption(opt =>
          opt
            .setName('title')
            .setDescription('Anime title')
            .setRequired(true)
        )
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('set')
        .setDescription('Set one of the suggested watch-parties as the current one')
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('unset')
        .setDescription('Remove one of the currently set watch-parties.')
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('delete')
        .setDescription('Delete a suggested watch-party from the list.')
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('list')
        .setDescription('List all the suggested watch-parties.')
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('join')
        .setDescription('Join a watch-party')
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('info')
        .setDescription('View members of a suggested watch-party')
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('leave')
        .setDescription('Leave a watch-party')
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('current')
        .setDescription('Show information on currently set watchparties')
    ),
  async execute (interaction: CommandInteraction) {
    const serverId = interaction.guildId
    const sub = interaction.options.getSubcommand()
    const query = { 'server.serverId': serverId }

    const countPartyServerDocs: number = await Party.find(query).limit(1).countDocuments()
    const partyServerExists = (countPartyServerDocs > 0)
    let thisServerParty: Parties = await Party.findOne(query)

    const countServerDocs: number = await Alias.find(query).limit(1).countDocuments()
    const serverExists = (countServerDocs > 0)
    const serverAliases: Aliases = await Alias.findOne(query)

    if (!partyServerExists) {
      const newServer = new Party({
        server: {
          serverId: serverId,
          current: []
        }
      })
      await newServer.save()
    } thisServerParty = await Party.findOne(query)

    await subcommands.get(sub).execute(interaction, thisServerParty, serverAliases, serverExists)
  }
}
