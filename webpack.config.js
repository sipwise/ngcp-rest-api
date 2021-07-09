const path = require("path")
const webpack = require('webpack')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin')

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
        loader: 'ts-loader',
        exclude: /node_modules/,
        options:
        {
          getCustomTransformers: (program) => ({
            before:
            [
              require('@nestjs/swagger/plugin').before(
              {
                dtoFileNameSuffix: ['.dto.ts', '.entity.ts'],
                classValidatorShim: true,
                introspectComments: true
              },
              program)
            ]
          }),
        },
      },
      {
        test: /\.(cs|html)$/,
        use: 'ignore-loader',
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
    new webpack.ProvidePlugin({ 'openapi': '@nestjs/swagger', }),
    new webpack.IgnorePlugin({
      checkResource: function(resource)
      {
        const lazyImports =
        [
              '@nestjs/microservices',
              '@nestjs/microservices/microservices-module',
              '@nestjs/websockets/socket-module',
              '@nestjs/platform-express',
              'bluebird',
              'cache-manager',
              'cardinal',
              'class-validator',
              'class-transformer',
              'class-transformer/storage',
              'pg-hstore',
              'nock',
              'npm',
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
