FROM ubuntu:18.04

LABEL Iterative, Inc

RUN apt-get update --fix-missing
RUN apt-get install -y \
    curl \
    apt-transport-https \
    ca-certificates \
    software-properties-common

RUN add-apt-repository ppa:git-core/ppa -y
RUN apt-get update
RUN apt-get install -y git

RUN apt-get install -y python-pip
RUN apt-get install -y python3-pip
RUN yes | pip3 install dvc[all]

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash
RUN apt install -y nodejs

ADD "./" "/dvc-cml"
RUN npm install -g /dvc-cml

COPY "./docker/entrypoint.sh" "/entrypoint.sh"
CMD ["/entrypoint.sh"]
