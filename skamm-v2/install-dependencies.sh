echo "installing global dependencies"
npm i -g npm-check-updates nodemon pkg browserify javascript-obfuscator prettier-eslint-cli terser
echo "installing local dependencies for tas"
cd tas/src/dev
npm i s
echo "patching lib"
node patch-lib.js
