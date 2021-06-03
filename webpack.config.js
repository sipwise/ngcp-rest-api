const path = require("path")
const webpack = require('webpack')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

module.exports =
{
  mode: 'none',
  target: 'node',
  entry:
  {
    server: './src/main.ts',
  },
  optimization:
  {
    minimize: false
  },
  output:
  {
    path: path.resolve(__dirname, 'prod'),
    filename: '[name].js',
  },
  module:
  {
    rules:
    [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve:
  {
    extensions: [ '.tsx', '.ts', '.js' ],
    plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.prod.json' })],
  },
  node:
  {
    __dirname: false,
  },
  plugins:
  [
    new CleanWebpackPlugin(),
    new webpack.IgnorePlugin({
      checkResource: function(resource)
      {
        const lazyImports =
        [
              '@nestjs/microservices',
              '@nestjs/microservices/microservices-module',
              '@nestjs/websockets/socket-module',
              '@nestjs/platform-express',
              'cache-manager',
              'cardinal',
              'class-validator',
              'class-transformer',
              'class-transformer/storage',
              'pg-hstore',
              'nock',
              'aws-sdk',
              'mock-aws-s3',
        ]

        if (!lazyImports.includes(resource))
          return false

        try
        {
          require.resolve(resource)
        }
        catch (err)
        {
          return true
        }

        return false
      }
    })
  ],
  ignoreWarnings:
  [
    /the request of a dependency is an expression/,
  ],
  //stats: 'verbose',
/*
  performance:
  {
    maxEntrypointSize: 1000000000,
    maxAssetSize: 1000000000
  },
*/
}
