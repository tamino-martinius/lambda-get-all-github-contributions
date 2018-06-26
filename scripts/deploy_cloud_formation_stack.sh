#!/usr/bin/env bash

cd "$(dirname "$0")" || exit
source ./env

aws cloudformation deploy --stack-name "$CLOUD_FORMATION_STACK_NAME" --template-file "$CLOUD_FORMATION_FILE" --capabilities CAPABILITY_IAM --parameter-overrides AwsServerlessExpressS3Bucket="$BACKEND_S3_BUCKET" --region "$AWS_REGION"
