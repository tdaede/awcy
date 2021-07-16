FROM ubuntu:focal

# environment variables
ENV \
	APP_USER=xiph \
	APP_DIR=/opt/app \
	LC_ALL=C.UTF-8 \
	LANG=C.UTF-8 \
	LANGUAGE=C.UTF-8 \
	DEBIAN_FRONTEND=noninteractive \
	GPG_SERVERS="ha.pool.sks-keyservers.net hkp://p80.pool.sks-keyservers.net:80 keyserver.ubuntu.com hkp://keyserver.ubuntu.com:80"

# add runtime user
RUN \
	groupadd --gid 1000 ${APP_USER} && \
	useradd --uid 1000 --gid ${APP_USER} --shell /bin/bash --create-home ${APP_USER}

# install base build dependencies and useful packages
RUN \
	echo "deb http://archive.ubuntu.com/ubuntu/ focal main restricted universe multiverse"           >/etc/apt/sources.list && \
	echo "deb http://security.ubuntu.com/ubuntu focal-security main restricted universe multiverse" >>/etc/apt/sources.list && \
	echo "deb http://archive.ubuntu.com/ubuntu/ focal-updates main restricted universe multiverse"  >>/etc/apt/sources.list && \
	apt-get update && \
	apt-get install -y --no-install-recommends \
		autoconf \
		automake \
		build-essential \
		bzip2 \
		ca-certificates \
		check \
		cmake \
		cmake-extras \
		ctags \
		curl \
		dirmngr \
		file \
		gettext-base \
		git-core \
		gpg \
		gpg-agent \
		iproute2 \
		iputils-ping \
		jq \
		less \
		libicu-dev \
		libjpeg-dev \
		libogg-dev \
		libpng-dev \
		libtool \
		locales \
		netcat-openbsd \
		net-tools \
		openjdk-8-jdk-headless \
		openssl \
		pkg-config \
		procps \
		psmisc \
		python2.7 \
		rsync \
		runit \
		sqlite3 \
		strace \
		tcpdump \
		tzdata \
		unzip \
		uuid \
		vim \
		wget \
		xz-utils \
		yasm \
		&& \
	apt-get clean && \
	rm -rf /var/lib/apt/lists

# install nasm
RUN \
	DIR=/tmp/nasm && \
	NASM_URL=http://debian-archive.trafficmanager.net/debian/pool/main/n/nasm && \
	NASM_VERSION=2.15.05-1 && \
	NASM_DEB=nasm_${NASM_VERSION}_amd64.deb && \
	NASM_SUM=c860caec653b865d5b83359452d97b11f1b3ba5b18b07cac554cf72550b3bfc9 && \
	mkdir -p ${DIR} && \
	cd ${DIR} && \
	curl -O ${NASM_URL}/${NASM_DEB} && \
	echo ${NASM_SUM} ${NASM_DEB} | sha256sum --check && \
	dpkg -i ${NASM_DEB} && \
	rm -rf ${DIR}

# set working directory
WORKDIR ${APP_DIR}

# prepare rust installation
ENV \
	RUSTUP_HOME=/usr/local/rustup \
	CARGO_HOME=/usr/local/cargo \
	PATH=/usr/local/cargo/bin:${PATH}

# install rust
RUN \
	RUST_VERSION=1.42.0 && \
	curl -sSf --output /tmp/rustup-init https://static.rust-lang.org/rustup/archive/1.14.0/x86_64-unknown-linux-gnu/rustup-init && \
	chmod +x /tmp/rustup-init && \
	/tmp/rustup-init -y --no-modify-path --default-toolchain ${RUST_VERSION} && \
	rm -vf /tmp/rustup-init

# install node 12.x
RUN \
	NODE_VERSION=12.16.1 && \
	ARCH=x64 && \
	for key in \
		4ED778F539E3634C779C87C6D7062848A1AB005C \
		B9E2F5981AA6E0CD28160D9FF13993A75599653C \
		94AE36675C464D64BAFA68DD7434390BDBE9B9C5 \
		B9AE9905FFD7803F25714661B63B535A4C206CA9 \
		77984A986EBC2AA786BC0F66B01FBB92821C587A \
		71DCFD284A79C3B38668286BC97EC7A07EDE3FC1 \
		8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600 \
		C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8 \
		DD8F2338BAE7501E3DD5AC78C273792F7D83545D \
		A48C2BEE680E841632CD4E44F07496B3EB3C1762 \
	; do \
		for server in $(shuf -e ${GPG_SERVERS}) ; do \
			http_proxy= gpg --keyserver "$server" --recv-keys "${key}" && break || : ; \
		done ; \
	done && \
	curl -fSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${ARCH}.tar.xz" && \
	curl -fSLO "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt.asc" && \
	gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc && \
	grep " node-v${NODE_VERSION}-linux-${ARCH}.tar.xz\$" SHASUMS256.txt | sha256sum -c - && \
	tar xJf "node-v${NODE_VERSION}-linux-${ARCH}.tar.xz" -C /usr --strip-components=1 --no-same-owner && \
	rm -vf "node-v${NODE_VERSION}-linux-${ARCH}.tar.xz" SHASUMS256.txt.asc SHASUMS256.txt && \
	ln -s /usr/bin/node /usr/bin/nodejs

# install emscripten
RUN \
	EMSDK_VERSION=1.40.1 && \
	EMSDK_HASH=e88a3c5bbfef172a5b947768204ef734e2fb6e04 && \
	mkdir -p /opt/emsdk && \
	curl -sSL https://github.com/emscripten-core/emsdk/archive/${EMSDK_HASH}.tar.gz | tar zxf - -C /opt/emsdk --strip-components=1 && \
	cd /opt/emsdk && \
	./emsdk update && \
	./emsdk install ${EMSDK_VERSION} && \
	./emsdk activate ${EMSDK_VERSION} && \
	echo "hack emscript config getter (em-config)" && \
	cp .emscripten /home/${APP_USER}/.emscripten && \
	printf '#!/usr/bin/env python\nimport os, sys\nexecfile(os.getenv("HOME")+"/.emscripten")\nprint eval(sys.argv[1])\n' >/usr/local/bin/em-config && \
	chmod a+x /usr/local/bin/em-config

# install tini
RUN \
	TINI_VERSION=v0.18.0 && \
	for server in $(shuf -e ${GPG_SERVERS}) ; do \
		http_proxy= gpg --keyserver "$server" --recv-keys 0527A9B7 && break || : ; \
	done && \
	wget -O/usr/bin/tini     "https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini" && \
	wget -O/usr/bin/tini.asc "https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini.asc" && \
	gpg --verify /usr/bin/tini.asc && \
	rm -f /usr/bin/tini.asc && \
	chmod a+x /usr/bin/tini

# install gosu
RUN \
	GOSU_VERSION=1.11 && \
	for server in $(shuf -e ${GPG_SERVERS}); do \
		http_proxy= gpg --keyserver "$server" --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4 && break || : ; \
	done && \
	wget -O/usr/bin/gosu     "https://github.com/tianon/gosu/releases/download/${GOSU_VERSION}/gosu-amd64" && \
	wget -O/usr/bin/gosu.asc "https://github.com/tianon/gosu/releases/download/${GOSU_VERSION}/gosu-amd64.asc" && \
	gpg --verify /usr/bin/gosu.asc && \
	rm -f /usr/bin/gosu.asc && \
	chmod a+x /usr/bin/gosu

# install daalatool
ENV \
	DAALATOOL_DIR=/opt/daalatool

RUN \
	mkdir -p $(dirname ${DAALATOOL_DIR}) && \
	git clone https://gitlab.xiph.org/xiph/daala.git ${DAALATOOL_DIR} && \
	cd ${DAALATOOL_DIR} && \
	./autogen.sh && \
	./configure --disable-player && \
	make tools -j4

# install ciede2000
ENV \
	CIEDE2000_DIR=/opt/dump_ciede2000

RUN \
	mkdir -p $(dirname ${CIEDE2000_DIR}) && \
	git clone https://github.com/KyleSiefring/dump_ciede2000.git ${CIEDE2000_DIR} && \
	cd ${CIEDE2000_DIR} && \
	cargo build --release

# install hdrtools
ENV \
	HDRTOOLS_DIR=/opt/hdrtools \
	HDRTOOLS_VERSION=0.21

RUN \
	mkdir -p ${HDRTOOLS_DIR} && \
	curl -sSfL --output HDRTools.tar.bz2 https://gitlab.com/standards/HDRTools/-/archive/v${HDRTOOLS_VERSION}/HDRTools-v${HDRTOOLS_VERSION}.tar.bz2 && \
	tar -xvf HDRTools.tar.bz2 --strip-components=1 -C ${HDRTOOLS_DIR} && \
	cd ${HDRTOOLS_DIR} && \
	sed -i 's/std::modff/modff/g' common/src/OutputY4M.cpp && \
	sed -i 's/using ::hdrtoolslib::Y_COMP;//g' projects/HDRConvScaler/src/HDRConvScalerYUV.cpp && \
	sed -i 's/\[Y_COMP\]/\[hdrtoolslib::Y_COMP\]/g' projects/HDRConvScaler/src/HDRConvScalerYUV.cpp && \
	make # -j is broken

# install rd_tool and dependencies
ENV \
	RD_TOOL_DIR=/opt/rd_tool

RUN \
	apt-get update && \
	apt-get install -y --no-install-recommends \
		bc \
		python3-boto3 \
		python3-numpy \
		python3-scipy \
		python3-tornado \
		ssh \
		time \
		&& \
	mkdir -p ${RD_TOOL_DIR} && \
	rm -vf /etc/ssh/ssh_host_* && \
	curl -sSL https://github.com/xiph/rd_tool/tarball/master | tar zxf - -C ${RD_TOOL_DIR} --strip-components=1

# install meson
RUN \
	apt-get install -y python3 python3-pip python3-setuptools python3-wheel ninja-build && \
	pip3 install meson

# install dav1d and dependencies
ENV \
	DAV1D_DIR=/opt/dav1d

RUN \
	git clone https://code.videolan.org/videolan/dav1d.git ${DAV1D_DIR} && \
	cd ${DAV1D_DIR} && \
	mkdir build && cd build && \
	meson .. && \
	ninja

# install VMAF
ENV \
	VMAF_DIR=/opt/vmaf \
	VMAF_VERSION=v2.2.0

RUN \
	mkdir -p ${VMAF_DIR} && \
	curl -sSL https://github.com/Netflix/vmaf/archive/refs/tags/${VMAF_VERSION}.tar.gz | tar zxf - -C ${VMAF_DIR} --strip-components=1 && \
	cd ${VMAF_DIR}/libvmaf && \
	meson build --buildtype release && \
	ninja -C build && \
	ninja -C build install

# clear package manager cache
RUN \
	apt-get clean && \
	rm -rf /var/lib/apt/lists

# add code
ADD package.json package-lock.json *.ts tsconfig.json ${APP_DIR}/
ADD www ${APP_DIR}/www

# compile typescript/nodejs code
RUN \
	cd ${APP_DIR} && \
	export PYTHON=python2.7 && \
	npm install && \
	npm run tsc && \
	cd ${APP_DIR}/www && \
	npm install && \
	npm run build

# add scripts
ADD *.m *.sh *.py ${APP_DIR}/

# environment variables
ENV \
	CONFIG_DIR=/data/conf \
	CODECS_SRC_DIR=/data/src \
	RUNS_DST_DIR=/data/runs \
	WORK_DIR=/data/work \
	MEDIAS_SRC_DIR=/data/media \
	LOCAL_WORKER_ENABLED=false \
	IRC_CHANNEL=none \
	AWCY_API_KEY=awcy_api_key \
	AWCY_SERVER_PORT=3000 \
	RD_SERVER_PORT=4000

# set entrypoint
ENTRYPOINT [ "/etc/entrypoint" ]

# add configuration scripts
ADD etc /etc
