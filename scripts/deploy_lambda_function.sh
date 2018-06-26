#!/usr/bin/env bash

cd "$(dirname "$0")" || exit
source ./env

# Convenience script, just regrouping all lambda function scripts
./package_lambda_function.sh
./upload_lambda_function.sh
./update_lambda_function.sh
