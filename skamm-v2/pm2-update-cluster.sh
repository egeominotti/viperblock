rm tas/src/dev/package-lock.json
git pull
sh pm2-stop-cluster.sh
sleep 1
sh pm2-start-cluster.sh
