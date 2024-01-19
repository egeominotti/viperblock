sudo apt-get update && sudo apt-get upgrade && sudo apt-get dist-upgrade

sudo apt-get install nodejs
sudo apt-get install npm
sudo apt-get install jq

sudo apt-get install unzip
curl -fsSL https://bun.sh/install | bash
source /root/.bashrc

sudo n install latest
npm i n -g
npm install aws-sdk
hash -r

sudo ufw allow 1789
sudo ufw allow 22
sudo ufw enable

# https://hub.docker.com/r/kadena/chainweb-node
# 1. Get signed database snapshot URL (assuming you use get-chainweb-image-url.js form above)

YOUR_DB_SNAPSHOT_URL=$(node get-chainweb-image-url.js)

# 2. Initialize a database that is persisted on a docker volume
docker run -ti --rm \
    --mount type=volume,source=chainweb-data,target=/data \
    --env DBURL=$YOUR_DB_SNAPSHOT_URL \
    kadena/chainweb-node \
    /chainweb/initialize-db.sh

# 3. Use the database volume with a Chainweb node
docker run \
    --detach \
    --restart always \
    --publish 1848:1848 \
    --publish 1789:1789 \
    --name chainweb-node-v5 \
    --mount type=volume,source=chainweb-data,target=/data \
    egeominotti/chainweb-node:v5

# check height node
curl -sk https://localhost:1789/chainweb/0.0/mainnet01/cut | jq
