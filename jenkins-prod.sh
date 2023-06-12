#!/bin/bash

# Load script variables:
# . Remote machine configuration
# . Docker configuration
source jenkins-env.sh

# Define and create a temporary directory to use as a mounting point for the shared folder
MOUNTING_POINT="/mnt/jenkins-prod.dir"
mkdir ${MOUNTING_POINT}

# Mount the remote shared folder to defined the mounting point
mount -t cifs //${REMOTE_ADDRESS}/${REMOTE_SHARED_FOLDER}/ ${MOUNTING_POINT} -o rw,uid=1000,credentials=${REMOTE_CREDENTIALS}

# Copy the repository from the current folder to the shared repository folder in the mounting point
# Exclude unnecessary folders and files: .git, node_modules, script and env for the deploy
# TODO: create a .jenkins-ignore file and exclude entries from there
rsync -av --progress ../${REPOSITORY_NAME} ${MOUNTING_POINT}/${REMOTE_REPOSITORY_FOLDER}/ --exclude .git --exclude node_modules --exclude jenkins-prod.sh --exclude jenkins-env.sh

# Connect via SSH to the remote machine and setup the docker environment:
# . Stop any running container with the same name (stop old container)
# . Remove the said container and relative image
# . Create new image from updated code base from the shared repository folder
# . Start a container using the new image and imported configurations - the ip is set automatically
ssh ${REMOTE_USER}@${REMOTE_ADDRESS} << EOF
    docker stop ${DOCKER_CONTAINER};
    docker rm ${DOCKER_CONTAINER};
    docker rmi ${DOCKER_IMAGE};
    docker build ${REMOTE_SHARED_ORIGINAL_FOLDER}/${REMOTE_REPOSITORY_FOLDER}/${REPOSITORY_NAME}/ -t ${DOCKER_IMAGE};
    docker run --net ${DOCKER_NETWORK} --name ${REPOSITORY_NAME}-c1 -d ${DOCKER_IMAGE};
EOF

# Once the deploy is completed, the shared folder can be unmounted, and the temp folder deleted
umount ${MOUNTING_POINT}
rmdir ${MOUNTING_POINT}