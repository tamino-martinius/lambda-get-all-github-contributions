#!/usr/bin/env bash

cd "$(dirname "$0")" || exit
source ./env

aws s3 mb s3://"$BACKEND_S3_BUCKET" --region "$AWS_REGION"
