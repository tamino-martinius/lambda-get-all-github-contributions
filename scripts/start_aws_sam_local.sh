#!/usr/bin/env bash

cd "$(dirname "$0")" || exit
source ./env

AWS_REGION="$AWS_REGION" sam local start-api --template="$CLOUD_FORMATION_FILE" --host="$SAM_LOCAL_API_HOST" --port="$SAM_LOCAL_API_PORT"
