/**
 * 开发模式对应的 webpack 配置。
 * 使用 node server.js 命令启用开发模式。
 */ 
var path = require("path");
var webpack = require('webpack');
var BundleTracker = require('webpack-bundle-tracker');

var ip = 'localhost';
//引入基础配置
var config = require('./webpack.config.base');

//每个module会通过eval()来执行，并且生成一个DataUrl形式的SourceMap.
config.devtool = "#eval-source-map";

//修改入口
config.entry.app = [
  'webpack-dev-server/client?http://' + ip + ':3000',
  'webpack/hot/only-dev-server',
  'react-hot-loader/patch',
  './html/app',
];

// Tell django to use this URL to load packages and not use STATIC_URL + bundle_name
config.output.publicPath = 'http://' + ip + ':3000' + '/html/static/bundles/'; 

//添加插件
config.plugins = config.plugins.concat([
  new webpack.NamedModulesPlugin(),   //当开启 HMR 的时候使用该插件会显示模块的相对路径
  new webpack.HotModuleReplacementPlugin(),
  new webpack.NoEmitOnErrorsPlugin(),
  new BundleTracker({filename: './webpack-stats-dev.json'}),
  new webpack.DefinePlugin({
    'process.env': {
      'NODE_ENV': JSON.stringify('development'),
      'BASE_API_URL': JSON.stringify('https://'+ ip +':8000/api/v1/'),
  }}),   
]);

//添加rule
config.module.rules.push(
  { 
    test: /\.jsx?$/, 
    exclude: /node_modules/, 
    use: [ 'babel-loader'] 
  }
);

module.exports = config;
