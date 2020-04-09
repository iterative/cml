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
    unzip \
    gpg-agent && \
    add-apt-repository universe -y && \
    add-apt-repository ppa:git-core/ppa -y && \
    apt-get install -y git && \
    curl -sL https://deb.nodesource.com/setup_12.x | bash && \
    apt-get install -y nodejs  && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install update pip and nodejs, install dvc and dvc-cml
ADD "./" "/dvc-cml"
RUN wget https://dvc.org/deb/dvc.list -O /etc/apt/sources.list.d/dvc.list && \
    apt update && apt install dvc && \
    npm install -g /dvc-cml && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# RUNNER 
ENV RUNNER_PATH=/home/runner
ENV RUNNER_LABELS=dvc-cml
ENV RUNNER_RUNTIME=nvidia
ENV RUNNER_IMAGE=dvcorg/dvc-cml-gpu:latest
ENV RUNNER_ALLOW_RUNASROOT=1

RUN mkdir ${RUNNER_PATH}
WORKDIR ${RUNNER_PATH}

# DOCKER, GITLAB RUNNER AND GITHUB RUNNER
RUN curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && \
    curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
    chmod +x /usr/local/bin/docker-compose && \
    wget -O /usr/local/bin/gitlab-runner https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-amd64 && \
    chmod +x /usr/local/bin/gitlab-runner && \
    gitlab-runner install --user=root --working-directory=${RUNNER_PATH} && \
    wget https://github.com/DavidGOrtega/gh-runner/releases/download/v2.168.0.1/actions-runner-linux-x64-2.168.0.1.tar.gz && \
    tar xzf actions-runner-linux-x64-2.168.0.1.tar.gz && \
    ./bin/installdependencies.sh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

CMD ["dvc_cml_start_runner"]
