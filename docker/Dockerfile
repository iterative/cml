ARG ARCH=
ARG CUDA=10.1
ARG UBUNTU_VERSION=18.04

FROM nvidia/cuda${ARCH:+-$ARCH}:${CUDA}-base-ubuntu${UBUNTU_VERSION} as base

LABEL maintainer="dvc.org"

ENV DEBIAN_FRONTEND=noninteractive
RUN echo "APT::Get::Assume-Yes \"true\";" > /etc/apt/apt.conf.d/90assumeyes

RUN apt-get update && \
    apt-get install --no-install-recommends --fix-missing \
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
        sudo \ 
        tzdata \
        locales && \
    locale-gen en_US.UTF-8 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# NODE GIT DVC VEGA DEPS
RUN add-apt-repository universe -y && \
    add-apt-repository ppa:git-core/ppa -y && \
    add-apt-repository ppa:longsleep/golang-backports -y && \
    wget https://dvc.org/deb/dvc.list -O /etc/apt/sources.list.d/dvc.list && \
    curl -sL https://deb.nodesource.com/setup_12.x | bash && \
    apt-get update && \
    apt-get install -y \
        git dvc nodejs \
        libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libfontconfig-dev \
        golang-go && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN npm config set user 0 && \
    npm install -g vega-cli vega-lite

ENV LANG='en_US.UTF-8' LANGUAGE='en_US:en' LC_ALL='en_US.UTF-8'

# CUDNN
ARG CUDA
ARG CUDNN=7.6.4.38-1
ARG CUDNN_MAJOR=7
ARG LIBNVINFER=6.0.1-1
ARG LIBNVINFER_MAJOR=6
ARG CUBLAS=10.2.1.243-1
ARG CUBLAS_MAJOR=10

SHELL ["/bin/bash", "-c"]

RUN apt update && apt-get install -y --no-install-recommends \
    cuda-command-line-tools-${CUDA/./-} \
    libcublas${CUBLAS_MAJOR}=${CUBLAS} \
    cuda-nvrtc-${CUDA/./-} \
    cuda-cufft-${CUDA/./-} \
    cuda-curand-${CUDA/./-} \
    cuda-cusolver-${CUDA/./-} \
    cuda-cusparse-${CUDA/./-} \
    libcudnn${CUDNN_MAJOR}=${CUDNN}+cuda${CUDA} \
    libfreetype6-dev \
    libhdf5-serial-dev \
    libzmq3-dev && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

ENV LD_LIBRARY_PATH /usr/local/cuda/extras/CUPTI/lib64:/usr/local/cuda/lib64:$LD_LIBRARY_PATH

# TENSORFLOW
RUN apt update && \
    apt-get install -y --no-install-recommends \
        libnvinfer${LIBNVINFER_MAJOR}=${LIBNVINFER}+cuda${CUDA} \
        libnvinfer-plugin${LIBNVINFER_MAJOR}=${LIBNVINFER}+cuda${CUDA} && \
    ln -s /usr/local/cuda/lib64/stubs/libcuda.so /usr/local/cuda/lib64/stubs/libcuda.so.1 && \
    echo /usr/local/cuda/lib64/stubs > /etc/ld.so.conf.d/z-cuda-stubs.conf && ldconfig && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
# TENSORFLOW ENDS

# DOCKER, OUR CUSTOM DOCKER MACHINE FORK THAT SUPPORTS GPU ACCELARATOR (DEPRECATED)
RUN curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && \
    go get github.com/iterative/machine && \
    mv $(go env GOPATH)/src/github.com/iterative $(go env GOPATH)/src/github.com/docker && \
    cd $(go env GOPATH)/src/github.com/docker/machine && make build && \
    ln -s $(go env GOPATH)/src/github.com/docker/machine/bin/docker-machine /usr/local/bin/docker-machine && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# FIX setup-python Action
RUN mkdir /__t
RUN ln -s /__t /opt/hostedtoolcache
ENV AGENT_TOOLSDIRECTORY=/opt/hostedtoolcache

# GITLAB RUNNER AND GITHUB RUNNER
ENV RUNNER_PATH=/home/runner
ENV RUNNER_ALLOW_RUNASROOT=1

RUN mkdir ${RUNNER_PATH}
WORKDIR ${RUNNER_PATH}

RUN wget -O /usr/local/bin/gitlab-runner https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-amd64 && \
    chmod +x /usr/local/bin/gitlab-runner && \
    gitlab-runner install --user=root --working-directory=${RUNNER_PATH} && \
    wget https://github.com/actions/runner/releases/download/v2.267.1/actions-runner-linux-x64-2.267.1.tar.gz && \
    tar xzf actions-runner-linux-x64-2.267.1.tar.gz && \
    ./bin/installdependencies.sh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# TERRAFORM
RUN wget https://github.com/iterative/terraform-provider-iterative/archive/v0.1.1.tar.gz && \
    tar xzf v0.1.0.tar.gz && \
    /bin/bash -c "cd terraform-provider-iterative-0.1.1; go mod vendor; make build; mkdir -p /terraform_plugins/github.com/iterative/iterative/0.1/linux_amd64; mv terraform-provider-iterative /terraform_plugins/github.com/iterative/iterative/0.1/linux_amd64/" && \
    curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add - && \
    apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main" && \
    apt update && apt-get install -y terraform && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# CML
ADD "./" "/cml"
RUN npm config set user 0 && \
    npm install -g /cml

CMD ["cml-cloud-runner-entrypoint"]
