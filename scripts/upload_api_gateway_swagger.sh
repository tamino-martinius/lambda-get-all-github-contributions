#!/usr/bin/env bash

cd "$(dirname "$0")" || exit
source ./env

aws s3 cp "$API_GATEWAY_FILE" s3://"$BACKEND_S3_BUCKET" --region "$AWS_REGION"
