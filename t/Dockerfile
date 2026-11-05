# DOCKER_NAME=ngcp-rest-api-tests-e2e-trixie
FROM docker.mgm.sipwise.com/sipwise-trixie:latest

# Important! Update this no-op ENV variable when this Dockerfile
# is updated with the current date. It will force refresh of all
# of the base images and things like `apt-get update` won't be using
# old cached versions when the Dockerfile is built.
ENV REFRESHED_AT=2026-11-06

# files that get-code generates
COPY t/sources.list.d/builddeps.list /etc/apt/sources.list.d/
COPY t/sources.list.d/preferences /etc/apt/preferences.d/

RUN apt-get update && \
    apt-get install --assume-yes --no-install-recommends \
        adduser \
        ca-certificates \
        g++ \
        git \
        libsystemd-dev \
        make \
        net-tools \
        nodejs \
        python3 \
        tzdata \
        vim-tiny \
        && \
    apt-get clean

RUN adduser --disabled-password --gecos="REST-API v2 Testuser" testuser

# we cannot use /code/ here otherwise it will be 'mounted over' with following 'docker run'
WORKDIR /home/testuser/api
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases/ .yarn/releases/
RUN node .yarn/releases/yarn-*.cjs install --immutable
RUN chown -R testuser:testuser /home/testuser/api

RUN echo "cd /code && ./t/testrunner <IP address of NGCP>" > /home/testuser/.bash_history
RUN echo "su - testuser" > /root/.bash_history

WORKDIR /home/testuser

################################################################################
# Instructions for usage
# ----------------------
# The e2e tests connect directly to MariaDB and Redis of the NGCP system.
#
# When you want to build the base image from scratch
# jump to the next section if you don't want to build yourself!:
#
# you need to put the proper NGCP sources at t/sources.list.d/builddeps.list
# for instance, trunk:
# echo "deb https://deb.sipwise.com/autobuild/ release-trunk-trixie main" > t/sources.list.d/builddeps.list
#
# NOTE: run the following command from root folder of git repository:
# % docker build --tag="ngcp-rest-api-tests-e2e-trixie" -f t/Dockerfile .
# % docker run --rm -i -t -v $(pwd):/code:rw -e API_DB_USER=... -e API_DB_PASS=... -e TZ=Europe/Vienna ngcp-rest-api-tests-e2e-trixie:latest bash
#
# Use the existing docker image (run from api base directory):
# % docker pull docker.mgm.sipwise.com/ngcp-rest-api-tests-e2e-trixie
# % docker run --rm -i -t -v $(pwd):/code:rw -e API_DB_USER=... -e API_DB_PASS=... -e TZ=Europe/Vienna docker.mgm.sipwise.com/ngcp-rest-api-tests-e2e-trixie:latest bash
#
# Environment:
#   API_DB_USER, API_DB_PASS     required
#   API_DB_HOST, API_REDIS_HOST  default: $NGCP_SYSTEM_IP
#   API_DB_PORT, API_REDIS_PORT  default: 3306, 6379
#   TZ                           must match the DB time zone, default: UTC
#
# Inside docker:
#   su - testuser
#   cd /code
# To run the full test suite:
#   ./t/testrunner $NGCP_SYSTEM_IP
# To run only particular tests (jest test path pattern, e.g. the phonebook ones):
#   ./t/testrunner $NGCP_SYSTEM_IP src/api/customers/phonebook
# To write JUnit XML to /results/api-e2e.xml:
#   ./t/testrunner $NGCP_SYSTEM_IP all /results/ junit
################################################################################
