# Getting Started

Ani-Bot currently uses application ("slash") commands. This makes it so each and every command - and subcommand - has its own description and usage information, all shown right when you type '/'.

![Slash Commands GIF](https://i.imgur.com/zTt6gyb.gif)

Most of Ani-Bot's commands are very straightforward and require little to no setup.

## Watch-Party setup

Watch-parties, the bot's way of managing anime group viewings, do require some easy setup. Ani-Bot is however loaded with many easy to understand misusage responses, guiding each user to proper setup without even reading this file!

![WP Suggest GIF](https://i.imgur.com/3Yj9OJf.gif)

The first step is to alias yourself to an AniList user - the bot won't know your AniList information until you link yourself! This alias makes commands like `/url`, `/progress`, and `/rating` all work with much more ease; instead of needing to remember one's AniList username each time you wish to check their url, anime progress or ratings, you can just mention their Discord name! In addition, of course, aliases enable use of the watch-parties.

Once you and your friends have been aliased to AniList users, you can go ahead and suggest an anime with `/wp suggest`. This will return an embed and a 'Join' button (active for 60 minutes following the message). Click the button, and you'll be added to the party! If you miss the button window, a similar action can be done through `/wp join`, which returns a dropdown list of all currently suggested anime.

Once an anime has been suggested, and you and your friends are ready to start watching, use `/wp set` to access a dropdown list of suggested anime, and just click one to set it. You're all done! Using `/wp view` will now return the progress of you and other members of that watch-party.

### /ep and Discussion Threads

To get even more out of your watch-parties, you can assign episodes to watch for the day/week. Using `/ep next` will allow you to choose the amount of episodes to assign, and will instantly generate a discussion thread. The next time you use the command, the old discussion thread will be archived and a new one will be generated!
