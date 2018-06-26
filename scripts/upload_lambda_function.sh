#!/usr/bin/env bash

cd "$(dirname "$0")" || exit
source ./env

aws s3 cp "$LAMBDA_FUNCTION_ZIP_FILE" s3://"$BACKEND_S3_BUCKET" --region "$AWS_REGION"
