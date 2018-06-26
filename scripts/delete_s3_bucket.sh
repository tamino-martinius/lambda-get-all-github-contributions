#!/usr/bin/env bash

cd "$(dirname "$0")" || exit
source ./env

aws s3 rm s3://"$BACKEND_S3_BUCKET"/"$LAMBDA_FUNCTION_ZIP_FILENAME" --region "$AWS_REGION"
aws s3 rm s3://"$BACKEND_S3_BUCKET"/"$API_GATEWAY_FILENAME" --region "$AWS_REGION"
aws s3 rb s3://"$BACKEND_S3_BUCKET" --region "$AWS_REGION"
