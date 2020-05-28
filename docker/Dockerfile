FROM ubuntu:18.04

LABEL maintainer="dvc.org"

ENV GOOGLE_APPLICATION_CREDENTIALS=".dvc/tmp/GOOGLE_APPLICATION_CREDENTIALS.json"

RUN apt-get update && \
    apt-get install -y --no-install-recommends --fix-missing \
        build-essential \
        apt-utils \
        apt-transport-https \
        ca-certificates \
        software-properties-common \
        pkg-config \
        curl \
        wget \
        unzip \
        gpg-agent \
        locales && \
    add-apt-repository universe -y && \
    add-apt-repository ppa:git-core/ppa -y && \
    apt-get install -y git && \
    curl -sL https://deb.nodesource.com/setup_12.x | bash && \
    apt-get install -y nodejs  && \
    locale-gen en_US.UTF-8 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV LANG='en_US.UTF-8' LANGUAGE='en_US:en' LC_ALL='en_US.UTF-8'

# Install update pip and nodejs, install dvc and cml
ADD "./" "/cml"
RUN wget https://dvc.org/deb/dvc.list -O /etc/apt/sources.list.d/dvc.list && \
    apt update && \
    apt -y install dvc && \
    apt -y install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev && \
    npm config set user 0 && \
    npm config set unsafe-perm true && \
    npm install -g /cml && \
    npm install -g vega-cli && \
    npm install -g vega-lite && \
    apt-get install -y libfontconfig-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# DOCKER, DOCKER MACHINE, GITLAB RUNNER AND GITHUB RUNNER 
ENV RUNNER_PATH=/home/runner
ENV RUNNER_ALLOW_RUNASROOT=1

RUN mkdir ${RUNNER_PATH}
WORKDIR ${RUNNER_PATH}

RUN curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && \
    curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
    chmod +x /usr/local/bin/docker-compose && \
    curl -L https://github.com/docker/machine/releases/download/v0.16.2/docker-machine-`uname -s`-`uname -m` >/tmp/docker-machine && \
    chmod +x /tmp/docker-machine && mv /tmp/docker-machine /usr/local/bin/docker-machine && \
    wget -O /usr/local/bin/gitlab-runner https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-amd64 && \
    chmod +x /usr/local/bin/gitlab-runner && \
    gitlab-runner install --user=root --working-directory=${RUNNER_PATH} && \
    wget https://github.com/actions/runner/releases/download/v2.263.0/actions-runner-linux-x64-2.263.0.tar.gz && \
    tar xzf actions-runner-linux-x64-2.263.0.tar.gz && \
    ./bin/installdependencies.sh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

CMD ["cml-runner-entrypoint"]
