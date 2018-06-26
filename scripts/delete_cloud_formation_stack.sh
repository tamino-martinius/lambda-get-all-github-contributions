#!/usr/bin/env bash

cd "$(dirname "$0")" || exit
source ./env

aws cloudformation delete-stack --stack-name "$CLOUD_FORMATION_STACK_NAME" --region "$AWS_REGION"
