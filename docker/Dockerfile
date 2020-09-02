ARG ARCH=
ARG CUDA=10.1
ARG UBUNTU_VERSION=18.04

FROM nvidia/cuda${ARCH:+-$ARCH}:${CUDA}-base-ubuntu${UBUNTU_VERSION} as base

LABEL maintainer="dvc.org"

ENV DEBIAN_FRONTEND=noninteractive
RUN echo "APT::Get::Assume-Yes \"true\";" > /etc/apt/apt.conf.d/90assumeyes

RUN apt-get update && \
    apt-get install --no-install-recommends --fix-missing \
        sudo\ 
        tzdata \
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

# GITLAB RUNNER AND GITHUB RUNNER
ENV RUNNER_PATH=/home/runner
ENV RUNNER_ALLOW_RUNASROOT=1

# FIXES Python setup Action
RUN mkdir /__t
RUN ln -s /__t /opt/hostedtoolcache
ENV AGENT_TOOLSDIRECTORY=/opt/hostedtoolcache

RUN mkdir ${RUNNER_PATH}
WORKDIR ${RUNNER_PATH}

RUN wget -O /usr/local/bin/gitlab-runner https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-amd64 && \
    chmod +x /usr/local/bin/gitlab-runner && \
    gitlab-runner install --user=root --working-directory=${RUNNER_PATH} && \
    wget https://github.com/actions/runner/releases/download/v2.267.1/actions-runner-linux-x64-2.267.1.tar.gz && \
    tar xzf actions-runner-linux-x64-2.267.1.tar.gz && \
    ./bin/installdependencies.sh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install update pip and nodejs, install dvc and cml
RUN wget https://dvc.org/deb/dvc.list -O /etc/apt/sources.list.d/dvc.list && \
    apt update && \
    apt -y install dvc && \
    apt -y install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

RUN npm config set user 0 && \
    npm config set unsafe-perm true && \
    npm install -g vega-cli && \
    npm install -g vega-lite && \
    apt-get install -y libfontconfig-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ADD "./" "/cml"
RUN npm config set user 0 && \
    npm config set unsafe-perm true && \
    npm install -g /cml

# TERRAFORM
RUN wget https://github.com/DavidGOrtega/terraform-provider-davidgortega/archive/v0.0.5.tar.gz && \
    tar xzf v0.0.5.tar.gz && \
    wget -q https://storage.googleapis.com/golang/getgo/installer_linux && \
    export SHELL=/bin/bash && chmod +x installer_linux && ./installer_linux && /bin/bash -c "source /root/.bash_profile; cd terraform-provider-davidgortega-0.0.5; go mod vendor; make install" && \
    curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add - && \
    apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main" && \
    apt update && apt-get install -y terraform

# # CUDNN
# ARG CUDA
# ARG CUDNN=7.6.4.38-1
# ARG CUDNN_MAJOR=7
# ARG LIBNVINFER=6.0.1-1
# ARG LIBNVINFER_MAJOR=6
# ARG CUBLAS=10.2.1.243-1
# ARG CUBLAS_MAJOR=10

# SHELL ["/bin/bash", "-c"]

# RUN apt update && apt-get install -y --no-install-recommends \
#     cuda-command-line-tools-${CUDA/./-} \
#     libcublas${CUBLAS_MAJOR}=${CUBLAS} \
#     cuda-nvrtc-${CUDA/./-} \
#     cuda-cufft-${CUDA/./-} \
#     cuda-curand-${CUDA/./-} \
#     cuda-cusolver-${CUDA/./-} \
#     cuda-cusparse-${CUDA/./-} \
#     libcudnn${CUDNN_MAJOR}=${CUDNN}+cuda${CUDA} \
#     libfreetype6-dev \
#     libhdf5-serial-dev \
#     libzmq3-dev && \
#     apt-get clean && \
#     rm -rf /var/lib/apt/lists/*

# ENV LD_LIBRARY_PATH /usr/local/cuda/extras/CUPTI/lib64:/usr/local/cuda/lib64:$LD_LIBRARY_PATH

# # TENSORFLOW
# RUN apt update && \
#     apt-get install -y --no-install-recommends \
#         libnvinfer${LIBNVINFER_MAJOR}=${LIBNVINFER}+cuda${CUDA} \
#         libnvinfer-plugin${LIBNVINFER_MAJOR}=${LIBNVINFER}+cuda${CUDA} && \
#     apt-get clean && \
#     rm -rf /var/lib/apt/lists/* && \
#     ln -s /usr/local/cuda/lib64/stubs/libcuda.so \
#             /usr/local/cuda/lib64/stubs/libcuda.so.1 && \
#     echo /usr/local/cuda/lib64/stubs > /etc/ld.so.conf.d/z-cuda-stubs.conf && \
#     ldconfig
# # TENSORFLOW ENDS

# DOCKER
# RUN curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && \
#     curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
#     chmod +x /usr/local/bin/docker-compose


CMD ["cml-cloud-runner-entrypoint"]
