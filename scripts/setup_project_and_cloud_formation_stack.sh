#!/usr/bin/env bash

cd "$(dirname "$0")" || exit
source ./env

(
  cd "$PROJECT_ROOT" || exit
  npm install
)
(aws s3api get-bucket-location --bucket "$BACKEND_S3_BUCKET" --region "$AWS_REGION" || ./create_s3_bucket.sh)
./package_lambda_function.sh
./upload_lambda_function.sh
./upload_api_gateway_swagger.sh
./deploy_cloud_formation_stack.sh
