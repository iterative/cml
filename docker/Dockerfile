FROM ubuntu:18.04

RUN apt-get update --fix-missing
RUN apt-get install -y \
    curl \
    apt-utils \
    apt-transport-https \
    ca-certificates \
    software-properties-common

# Install latest git
RUN add-apt-repository ppa:git-core/ppa -y
RUN apt update
RUN apt install -y git

# Upgrade pip
RUN apt-get install -y python3-pip && pip3 install --upgrade pip
RUN apt-get install -y python-pip && pip2 install --upgrade pip
RUN pip install --upgrade setuptools

# Install nodejs 12x
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash
RUN apt-get install -y nodejs

# Install dvc
RUN yes | pip3 install dvc[all]

# Install dvc-cml
ADD "./" "/dvc-cml"
RUN npm install -g /dvc-cml

LABEL Iterative, Inc

COPY "./docker/entrypoint.sh" "/entrypoint.sh"
CMD ["/entrypoint.sh"]
