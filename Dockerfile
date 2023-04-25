FROM node:19.8.1
WORKDIR /usr/src/app
COPY *.json ./
RUN npm install
COPY . .
CMD ["npm", "test"]

# To build the image of this project:                           docker build . -t ts-stranger-bot
# To list all the images created:                               docker images
# To start a container with the new image (with custom id):     docker run (--name ts-stranger-bot-c1) -d ts-stranger-bot
# To list all the containers created:                           docker container ls (-a)
# To check all the containers running and their id:             docker ps
# To check the logs produced by the container:                  docker logs <container_id || name>
# To stop a running container:                                  docker kill <container_id || name>
# To restart a running or stopped container:                    docker restart <container_id || name>