# Ani-Bot
A Discord bot for searching anime, user scores/progress, and managing watch-parties.

Ani-Bot queries data from AniList's GraphQL API, and is written entirely in JavaScript, using the Discord.js library.

### Watch-parties
The main feature of Ani-Bot is the creation of watch-parties. The first step is *suggesting* an anime for your group of friends to watch together (`/wp suggest <anime title>`). Any member of the server may choose to partake, either by reacting to a prompt, or by using `/wp join`. The watchparty command can then be used to check the progress of all members on the anime.
#### Threads
Discord.js v13 adds support for the new threads feature. A user can now set the assigned episodes for the watchparty using `/ep next <# of episodes>`, and a discussion thread will be automatically generated for those episodes - and don't worry, the thread starter message that peeks at the thread's messages is auto-erased to avoid spoilers! The previous discussion thread (if there is one) is automatically archived after setting new episodes.

## Invite
Feel free to invite the bot to your own server using [this](https://discord.com/api/oauth2/authorize?client_id=859183792013836348&permissions=259846043728&scope=bot%20applications.commands) link! Type '/' to open the list of available slash commands and their descriptions.

## Contribution
I'll be polishing and updating this project as much as I can in the coming months, but I'm only one (relatively inexperienced) person! Any contributions to the project are welcome and appreciated, even in the form of sending issues/discussion posts.
#### Creating a new command:
Add your new command to the commands folder following the format for usage, description, etc. found in other command files. Then define & import your command file into the commands/index.js directory.
#### Testing:
If you wish to independently test your contributions, you'll need to generate a token to place in the .env (*.envtemplate*). Create a new Discord [application](https://discord.com/developers/applications/) and create a bot in the application with the proper permissions. Then invite the bot to a test server and paste your token into the .env. Don't forget to run `npm install` in your shell to install all required dependencies. 

