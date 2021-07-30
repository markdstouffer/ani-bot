const { prefix } = require('../config.json')

module.exports = {
	name: 'help',
	description: 'List all of my commands or info about a specific command.',
	aliases: ['commands'],
	usage: '[command name]',
	execute(msg, args) {
		const data = []
    const { commands } = msg.client

    if (!args.length) {
      data.push('List of commands:')
      data.push(commands.map(command => command.name).join(', '))
      data.push(`\nYou can send \`${prefix}help <command name>\` to get info on a specific command!`)
      return msg.author.send({content: `${data}`})
        .then(() => {
          if (msg.channel.type === 'dm') return;
          msg.reply({content: 'I\'ve sent you a DM with all of the commands!'})
        })
        .catch(error => {
          console.error(`Could not send help DM to ${msg.author.tag}.\n`, error)
          msg.reply({content: 'It seems like I can\'t DM you! Do you have DMs disabled?'})
        })
    }

    const name = args[0].toLowerCase();
    const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

    if (!command) {
	    return msg.channel.send({ content: 'that\'s not a valid command!' });
    }

    data.push(`**Name:** ${command.name}`);

    if (command.aliases) data.push(`\n**Aliases:** ${command.aliases.join(', ')}`);
    if (command.description) data.push(`\n**Description:** ${command.description}`);
    if (command.usage) data.push(`\n**Usage:** \`${prefix}${command.name} ${command.usage}\``);
            
    msg.channel.send({ content: `${data.join(' ')}` });
	}
}