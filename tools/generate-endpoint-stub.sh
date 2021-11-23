#!/usr/bin/env bash

endpoint_path="api"

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <endpointname>"
    exit 1
fi

yarn=$(which yarn)
if [[ -z "$yarn" ]]; then
    yarn=$(which yarnpkg)
    if [[ -z "$yarn" ]]; then
        echo "cannot find yarn installation"
        exit 2
    fi
fi

yarn nest generate module "$endpoint_path/$1"
yarn nest generate service "$endpoint_path/$1"
yarn nest generate controller "$endpoint_path/$1"
