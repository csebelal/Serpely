#!/bin/bash
# Serpely - redeploy script (run on VPS after git pull)
set -e

cd /var/www/Serpely

echo "-> Installing dependencies..."
cd app && npm install --silent
cd ../server && npm install --silent

echo "-> Building frontend..."
cd ../app && npm run build

echo "-> Building backend..."
cd ../server && npm run build

echo "-> Restarting API..."
pm2 restart serpely-api

echo "Deployment complete"
