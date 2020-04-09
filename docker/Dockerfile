FROM ubuntu:18.04

LABEL maintainer="Iterative Inc"

RUN apt-get update && apt-get install -y --no-install-recommends --fix-missing \
    build-essential \
    apt-utils \
    apt-transport-https \
    ca-certificates \
    software-properties-common \
    pkg-config \
    curl \
    wget \
    unzip
    
# Install latest git
RUN add-apt-repository ppa:git-core/ppa -y
RUN apt-get update
RUN apt-get install -y git

# Upgrade pip
RUN apt-get install -y python-pip && pip2 install --upgrade pip
RUN apt-get install -y python3-pip && pip3 install --upgrade pip
RUN rm /usr/local/bin/pip && ln -s /usr/local/bin/pip2 /usr/local/bin/pip

# Install nodejs 12x
RUN apt-get update && apt-get install -y gpg-agent
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash
RUN apt-get install -y nodejs

# Install dvc
RUN yes | pip3 install dvc[all]

# Install dvc-cml
ADD "./" "/dvc-cml"
RUN npm install -g /dvc-cml

ENV RUNNER_PATH=/home/runner
RUN mkdir ${RUNNER_PATH}
WORKDIR ${RUNNER_PATH}

ENV RUNNER_LABELS=dvc-cml

# DOCKER
RUN curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
RUN curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
    chmod +x /usr/local/bin/docker-compose

# GITLAB RUNNER
RUN wget -O /usr/local/bin/gitlab-runner https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-amd64
RUN chmod +x /usr/local/bin/gitlab-runner
RUN gitlab-runner install --user=root --working-directory=${RUNNER_PATH}

# GITHUB RUNNER
ENV RUNNER_ALLOW_RUNASROOT=1
RUN wget https://github.com/DavidGOrtega/gh-runner/releases/download/v2.200.8/actions-runner-linux-x64-2.200.8.tar.gz
RUN tar xzf actions-runner-linux-x64-2.200.8.tar.gz
RUN ./bin/installdependencies.sh

CMD ["dvc_cml_start_runner"]
