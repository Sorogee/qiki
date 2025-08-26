#!/bin/sh
set -e
# Run migrations, then start
npx prisma migrate deploy
node dist/index.js
