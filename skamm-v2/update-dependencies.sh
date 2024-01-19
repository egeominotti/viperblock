echo "updating global dependencies"
npm i -g npm-check-updates
ncu -u -g
echo "updating local tas dependencies"
cd ../../../tas/src/dev/
ncu -u
npm i s
