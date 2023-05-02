## TODO
- Check bot behaviour on denied permissions
- Setup payment system

Supporter features
- Nickname system (see other people nicknames and change yours)
- No skip limit (implement a limit for other users)
- Summary message (do not send for other users)
- "Suggestions" write privilege to supporters in Discord server

<br/>

# Local Environment

## Setup

To install all the required dependancies listed in the package.json
```
npm install
```

For the bot to start, a .env file is required. There are a few necessary variables. Here's an example:
```
PREFIX = $
VERSION = 1.0.0

PROD = 1
TEST_TOKEN = test_bot_token
PROD_TOKEN = prod_bot_token
PROD_APPID = 1324354657687980170

HASH_SECRET = some_random_string
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
docker run --net stranger-bot-network --ip 172.18.0.11 -p 27017:27017 -v /data/db:/home/pupazzo/Desktop/mongodb-volumes/mongo-c1 --name mongo-c1 -d mongo
```