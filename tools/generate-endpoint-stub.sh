#!/usr/bin/env bash

output=$(yarn nest)
project_path="$output" | sed -En 's/^.*\$\s(\S*)(node\S*)/\1/gmp'

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


mkdir ${project_path}src/api/$1/dto
mkdir ${project_path}src/api/$1/interfaces
mkdir ${project_path}src/api/$1/repositories

touch ${project_path}src/api/$1/dto/$1-create.dto.ts
touch ${project_path}src/api/$1/dto/$1-response.dto.ts
touch ${project_path}src/api/$1/dto/$1-search.dto.ts

touch ${project_path}src/api/$1/interfaces/$1.repository.ts

touch ${project_path}src/api/$1/repositories/$1.mariadb.repository.ts
touch ${project_path}src/api/$1/repositories/$1.mock.repository.ts
