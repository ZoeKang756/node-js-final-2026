#!/bin/sh
set -e
 
echo "[entrypoint] 執行資料庫 migration..."
npm run migration:run
 
echo "[entrypoint] migration 完成，啟動伺服器..."
exec "$@"
 