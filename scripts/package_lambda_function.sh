#!/usr/bin/env bash

cd "$(dirname "$0")" || exit
source ./env

(
  cd "$PROJECT_ROOT" || exit
  npm prune --production
  zip -FSqr "$LAMBDA_FUNCTION_ZIP_FILENAME" "$LAMBDA_FUNCTION_FILENAME" "$NODE_MODULES_DIRNAME"
  npm install --only=dev
)
