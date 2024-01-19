echo "[tas] > entering tas root directory"
cd tas
echo "[tas] > cleaning dist files"
rm -rf dist
echo "[tas] > cleaning prod files"
rm -rf src/prod/*.*
echo "[tas] > entering source code dev directory"
cd src/dev
echo "[tas] > formatting source code"
prettier-eslint --write "**/*.js"
prettier-eslint --write "**/*.json"
echo "[tas] > updating client package version"
npm version minor # (major | minor | patch)
echo "[tas] > bundling source code"
browserify --node --ignore-missing tas.js | terser --compress --mangle >../prod/tas.bundle.js
echo "[tas] > entering source code prod directory"
cd ../prod
echo "[tas] > obfuscating source code"
javascript-obfuscator tas.bundle.js --output tas.bundle.obfuscated.js
echo "[tas] > moving directory"
cd ../dev
echo "[tas] > preparing executables"
pkg .
echo "[tas] > done"
