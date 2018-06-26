#!/usr/bin/env bash

cd "$(dirname "$0")" || exit
source ./env

aws lambda update-function-code --function-name "$LAMBDA_FUNCTION_NAME" --region "$AWS_REGION" --zip-file fileb://"$LAMBDA_FUNCTION_ZIP_FILE"
