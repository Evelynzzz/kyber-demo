/**
 * webpack基础配置。
 * 在 webpack.config.dev.js 和 webpack.config.prod.js 文件中被引入。
 */
var path = require("path");
var webpack = require('webpack');
//引入样式抽离插件
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  //基础目录，入口起点会相对于此目录查找
  context: __dirname, 

  entry: {
    // Add as many entry points as you have container-react-components here
    app: './html/app.js',
    vendors: ['react']  //指定第三方插件打包到 vendors.js 中
  },

  output: {
    //打包文件输出目录
    path: path.resolve('./html/static/bundles/dev/'),
    filename: "app.js",
    chunkFilename: "[name].bundle.js",
    //访问静态资源的基础路径
    publicPath: 'html/static/bundles/'
  },

  externals: [
  ], // add all vendor libs

  plugins: [
    //提取多个入口chunk的公共模板
    new webpack.optimize.CommonsChunkPlugin({name:'vendors', filename:'vendors.js'}),
    //配置全局/共享的加载器配置
    new webpack.LoaderOptionsPlugin({  
      options: {  
          postcss: function(){  
            return [  
                require("autoprefixer")({  
                    browsers: ['ie>=8','>1% in CN']  
                })  
            ]  
          }  
        }  
    }),
    new ExtractTextPlugin({ //样式文件单独打包
      filename: "app.css",
      disable: false,
      allChunks: true
    })
  ], // add all common plugins here

  module: {
    rules:[
      {
        test: /\/expression\/parser\.js$/, 
        use: 'exports-loader?parser'
      },
      {
        test: /\.css$/,
        use: ['css-hot-loader'].concat(ExtractTextPlugin.extract({
          fallback:'style-loader',
          use:['css-loader', 'postcss-loader'],
        }))
      },
      {
        test: /\.less$/i,
        use: ['css-hot-loader'].concat(ExtractTextPlugin.extract({
          fallback:'style-loader',
          use:['css-loader', 'less-loader'],
        }))
      },
      {
        test: /\.html$/, 
        use: 'raw-loader'
      },
      {
        test: /\.(gif|png|jpg)$/, 
        use: 'url-loader?limit=8192'
      },
      // the url-loader uses DataUrls. url-loader封装了file-loader。
      //小于(limit/1024)kb的woff/wpff2文件被编码成DataURL，并内联到代码中.
      //大于这个限制的文件会使用file-loader打包。通过http请求加载。
      {
        test: /\.(woff|woff2|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/, 
        use: 'url-loader?limit=81920'
      }      
    ] // add all common loaders here
  },

  resolve: {
    modules:['node_modules', 'bower_components'],
    extensions: ['.js', '.jsx', '.css']
  }
};
