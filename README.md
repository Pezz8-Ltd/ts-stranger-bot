# Local Environment

## Setup

To install all the required dependancies listed in the package.json
```
npm install
```

For the bot to start, a .env file is requried. There are a few necessary variables. Here's an example:
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

To create your image (from the project's root directory):
```
docker build . -t ts-stranger-bot
```

### Local Network
Since we need to connect a MongoDB database, we need to set up a local network to keep all our services.
Once the network is created, run the bot.
```
docker network create stranger-bot-network subnet=172.18.0.0/16
```

### MongoDB
Download the mongo latest image and run it in our local network.
```
docker pull mongo
```
The container will need to have a static ip address so we can save it in the .env file of the bot (For now™).
Create a directory on the host to save the container data to avoid losing data during container changes or updates (volume).

## Run
Our images and networks are ready to be run in a container.
While the previous configuration is only needed once (if nothing changes), these are the only commands needed after a new release.
```
docker run --net stranger-bot-network --ip 172.18.0.10 --name ts-stranger-bot-c1 -d ts-stranger-bot
docker run --net stranger-bot-network --ip 172.18.0.11 -p 27017:27017 -v /data/db:/home/pupazzo/Desktop/mongodb-volumes/mongo-c1 --name mongo-c1 -d mongo
```