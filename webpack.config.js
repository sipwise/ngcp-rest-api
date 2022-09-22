const path = require("path")
const webpack = require('webpack')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

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
      {
        test: /bcrypt\/bcrypt\.js$/,
        loader: 'string-replace-loader',
        options: {
          multiple: [
            {
              search: "var nodePreGyp = require('@mapbox/node-pre-gyp');",
              replace: "",
              strict: true,
            },
            {
              search: "var binding_path = nodePreGyp.find(path.resolve(path.join(__dirname, './package.json')));",
              replace: "",
              strict: true
            },
            {
              search: "var bindings = require(binding_path);",
              replace: "var bindings = require('bindings')('bcrypt_lib');",
              strict: true
            },
          ]
        }
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
              '@google-cloud/spanner',
              '@nestjs/microservices',
              '@nestjs/microservices/microservices-module',
              '@nestjs/websockets/socket-module',
              '@nestjs/platform-express',
              '@sap/hana-client',
              'aws-sdk',
              'better-sqlite3',
              'bluebird',
              'cache-manager',
              'cardinal',
              'class-validator',
              'class-transformer',
              'class-transformer/storage',
              'ioredis',
              'hdb-pool',
              'pg-hstore',
              'pg-query-stream',
              'nock',
              'npm',
              'mock-aws-s3',
              'mongodb',
              'mssql',
              'mysql',
              'oracledb',
              'pg',
              'pg-native',
              'react-native-sqlite-storage',
              'redis',
              'sqlite3',
              'sql.js',
              'typeorm-aurora-data-api-driver',
        ]

        const ignoreImports = [
            '@mapbox/node-pre-gyp',
        ]

        if (ignoreImports.includes(resource))
          return true

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
    }),
    new webpack.ContextReplacementPlugin(
      /yargs/,
      (data) => {
        for (let d of data.dependencies)
          delete d.critical
        return data;
      },
    ),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node',
          to: './build/bcrypt_lib.node',
        },
        {
          from: './node_modules/sd-notify/build/Release/notify.node',
          to: './build/notify.node',
        },
        {
          from: './node_modules/unix-dgram/build/Release/unix_dgram.node',
          to: './build/unix_dgram.node',
        },
        {
          from: './package.json',
          to: './package.json',
        },
      ],
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
