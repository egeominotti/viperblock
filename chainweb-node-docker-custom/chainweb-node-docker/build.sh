docker build -t egeominotti/chainweb-node:v6 .
docker push egeominotti/chainweb-node:v6

docker run \
    --detach \
    --restart always \
    --publish 1848:1848 \
    --publish 1789:1789 \
    --name chainweb-node-v6 \
    --mount type=volume,source=chainweb-data,target=/data \
    egeominotti/chainweb-node:v6