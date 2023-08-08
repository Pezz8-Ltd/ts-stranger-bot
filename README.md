## Overview
Meet new people from your Discord voice channel in complete anonymity! 

StrangerBot is a Discord bot that lets you talk with other people from the voice chat of your server, without giving them your account informations (unless you tell them youself!).
If you're familiar with Omegle or the infamous Telegram's counterpart, you basically know how this bot works.

The bot relies on slash commands to work, and implements various features:
- Join a conversation with kind strangers, skipping between them and stopping at your wish (obviously)
- Select a language to match with people from your country
- Choose a custom nickname to display instead of the generated one
- Summary DM of your conversations (duration and strangers nickname)

You can invite the bot to your server [here](https://discord.com/api/oauth2/authorize?client_id=1095390624963907637&permissions=2184252928&scope=applications.commands%20bot).
Join us in the [official Discord server](https://discord.gg/krNZUMB9Tq) if you have any suggestion or just to hang out!

## TODO
- Check bot behaviour on denied permissions
- Setup payment system

Define and implement supporter features

<br/>

# Local Environment

## Setup

To install all the required dependancies listed in the package.json
```
npm install
```

For the bot to start, a .env file is required. There are a few necessary variables. Here's an example:
```
TEST_TOKEN = test_bot_token
PROD_TOKEN = prod_bot_token

TEST_MONGO_ADDRESS = mongodb://127.0.0.1:27017/strangers
PROD_MONGO_ADDRESS = mongodb://172.18.0.11:27017/strangers

PROD_APPID = 1324354657687980170
VERSION = 1.0.0
HASH_SECRET = some_random_string

PROD = 1                          # False if not defined
LOG_LEVEL = INFO                  # INFO if not defined
```

## Run
All the necessary commands for testing, transpiling and running are included in the package.json.

To run the bot in "test" mode for developing purposes:
```
npm test
```

To transpile the TypeScript source code to a JavaScript module and run it:
```
npm run build
npm start
```

<br/>

# Docker Environment

## Setup

### Image creation
All the necessary files to prepare the docker image are in the repository (Dockerfile, .dockerignore).

To create the bot image (from the project's root directory):
```
docker build . -t ts-stranger-bot
```

### Local Network
Since a connection to MongoDB database is needed, set up a local network to keep all the services.
```
docker network create stranger-bot-network subnet=172.18.0.0/16
```

### MongoDB
Download the mongo latest image:
```
docker pull mongo
```
The container will need to have a static ip address so that it can be saved in the .env file of the bot (For now™).
Create a directory on the host to save the container data to avoid losing data during container changes or updates (volume).

## Run
The images and networks are ready to be run in a container.
While the previous configuration is only needed once (if nothing changes), these are the only commands needed after a new release.
```
docker run --net stranger-bot-network --ip 172.18.0.10 --name ts-stranger-bot-c1 -d ts-stranger-bot
docker run --net stranger-bot-network --ip 172.18.0.11 -p 27017:27017 -v /data/db:/home/tizio/Desktop/mongodb-volumes/mongo-c1 --name mongo-c1 -d mongo
```
