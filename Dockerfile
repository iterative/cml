ARG BASE_IMAGE=ubuntu:20.04
FROM ${BASE_IMAGE}

LABEL maintainer="CML <support@cml.dev>"

# CONFIGURE NON-INTERACTIVE APT
ENV DEBIAN_FRONTEND=noninteractive
RUN echo 'APT::Get::Assume-Yes "true";' > /etc/apt/apt.conf.d/90assumeyes

# CONFIGURE SHELL
SHELL ["/bin/bash", "-c"]

# INSTALL CORE DEPENDENCIES
RUN apt-get update \
 && apt-get install --no-install-recommends \
    build-essential \
    apt-utils \
    apt-transport-https \
    ca-certificates \
    iputils-ping \
    software-properties-common \
    pkg-config \
    curl \
    wget \
    unzip \
    gpg-agent \
    sudo \
    tzdata \
    locales \
 && locale-gen en_US.UTF-8 \
 && apt-get clean \
 && rm --recursive --force /var/lib/apt/lists/*

# CONFIGURE LOCALE
ENV LANG="en_US.UTF-8"
ENV LANGUAGE="en_US:en"
ENV LC_ALL="en_US.UTF-8"

# INSTALL NODE, GIT & GO
RUN add-apt-repository ppa:git-core/ppa --yes \
 && add-apt-repository ppa:longsleep/golang-backports --yes \
 && curl --location https://deb.nodesource.com/setup_16.x | bash \
 && apt-get update \
 && apt-get install --yes git golang-go nodejs \
 && apt-get clean \
 && rm --recursive --force /var/lib/apt/lists/*

# INSTALL TERRAFORM
RUN curl --location https://apt.releases.hashicorp.com/gpg | sudo apt-key add - \
 && apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release --codename --short) main" \
 && apt update \
 && apt-get install --yes terraform \
 && apt-get clean \
 && rm --recursive --force /var/lib/apt/lists/*

# INSTALL PYTHON
ARG PYTHON_VERSION=3
RUN add-apt-repository universe --yes \
 && apt-get update \
 && PYTHON_SUFFIX="$(sed --expression='s/3.*/3/g' --expression='s/2.*//g' <<< "${PYTHON_VERSION}")" \
 && apt-get install --yes --no-install-recommends python${PYTHON_VERSION} python${PYTHON_SUFFIX}{-pip,-setuptools,-dev} \
 && update-alternatives --install /usr/bin/python python${PYTHON_VERSION} $(which python${PYTHON_VERSION}) 10 \
 && python -m pip install pip --upgrade \
 && apt-get clean \
 && rm --recursive --force /var/lib/apt/lists/*

# INSTALL DVC
ARG DVC_VERSION=2
RUN cd /etc/apt/sources.list.d \
 && wget https://dvc.org/deb/dvc.list \
 && apt-get update \
 && apt-get install --yes "dvc=$(if [ "$DVC_VERSION" = "1" ]; then echo "${DVC_VERSION}.*" ; else echo 2.8.3 ; fi)" \
 && apt-get clean \
 && rm --recursive --force /var/lib/apt/lists/*

# INSTALL CML
ARG CML_VERSION=0
RUN npm config set user 0 \
 && npm install --global "@dvcorg/cml@${CML_VERSION}"

# INSTALL VEGA
RUN add-apt-repository universe --yes \
 && apt-get update \
 && apt-get install --yes \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libfontconfig-dev \
 && apt-get clean \
 && rm --recursive --force /var/lib/apt/lists/* \
 && npm config set user 0 \
 && npm install --global canvas@2 vega@5 vega-cli@5 vega-lite@4

# CONFIGURE RUNNER PATH
ENV CML_RUNNER_PATH=/home/runner
RUN mkdir ${CML_RUNNER_PATH}
WORKDIR ${CML_RUNNER_PATH}

# SET SPECIFIC ENVIRONMENT VARIABLES
ENV IN_DOCKER=1
ENV RUNNER_ALLOW_RUNASROOT=1

# DEFINE ENTRY POINT AND COMMAND
# Smart entrypoint understands commands like `bash` or `/bin/sh` but defaults to `cml`;
# also works for GitLab CI/CD
# https://gitlab.com/gitlab-org/gitlab-runner/-/blob/4c42e96/shells/bash.go#L18-37
# https://gitlab.com/gitlab-org/gitlab-runner/-/blob/4c42e96/shells/bash.go#L288
ENTRYPOINT ["/bin/bash", "-c", "echo \"$0\" | grep -qE '^(pr|publish|runner|send-(comment|github-check)|tensorboard-dev|--?\\w.*)$' && exec cml \"$0\" \"$@\" || exec \"$0\" \"$@\""]
CMD ["--help"]
