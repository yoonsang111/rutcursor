#!/bin/bash

set -e

echo "🚀 Starting local-beta API..."

mkdir -p "packages/server/data/local-beta"

NODE_ENV=local-beta \
PORT=3102 \
DATA_DIR=packages/server/data/local-beta \
CORS_ORIGIN=http://localhost:3000,http://localhost:3001 \
npm run start --workspace=packages/server
