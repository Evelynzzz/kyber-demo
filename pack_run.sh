rm -rf html/static/bundles/prod/*
node_modules/.bin/webpack --config webpack.config.prod.js --progress --colors -p