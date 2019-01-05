var webpack = require('webpack');
var BundleTracker = require('webpack-bundle-tracker');

var config = require('./webpack.config.base');  //引入基础配置
config.output.path = require('path').resolve('./html/static/bundles/'); //输出打包文件的目录

//添加插件
config.plugins = config.plugins.concat([
  //生成 stats 文件供 django templates 中的 render_bundle 读取
  new BundleTracker({
    filename: './webpack-stats-prod.json'
  }),
  // removes a lot of debugging code in React
  new webpack.DefinePlugin({
    'process.env': {
      'NODE_ENV': JSON.stringify('production'),
      'BASE_API_URL': JSON.stringify('https://example.com/api/v1/'),
    }
  }),
  //webpack2的UglifyJsPlugin不再压缩loaders，通过以下设置来压缩loaders
  new webpack.LoaderOptionsPlugin({
    minimize: true
  }),
  // minifies your code
  new webpack.optimize.UglifyJsPlugin({
    compressor: {
      warnings: false,  //在UglifyJS删除没有用到的代码时不输出警告
      drop_console:true,  //删除所有的console语句
    },
    output: {
      comments: false, //关闭注释
    },
  })
]);

// Add a loader for JSX files
config.module.rules.push({
  test: /\.jsx?$/,
  exclude: /node_modules/,
  loader: 'babel-loader'
});

module.exports = config;