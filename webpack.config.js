const path = require("path")
const webpack = require('webpack')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const TerserPlugin = require("terser-webpack-plugin");

module.exports =
{
  //stats: 'verbose',
  mode: 'production',
  target: 'node',
  entry:
  {
    server: './src/main.ts',
  },
  optimization:
  {
    nodeEnv: process.env.NODE_ENV == 'development' ? 'development' : 'production',
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        extractComments: true,
        terserOptions: {
          ecma: 2022,
          compress: false, // causes issues when compressed and the size difference is only 1-3%
          mangle: false,
          keep_classnames: true,
          keep_fnames: true,
        },
      }),
    ]
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
        test: /\.(cs|html|css)$/i,
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
          '@nestjs/microservices/microservices-module',
          '@nestjs/microservices',
          '@nestjs/microservices',
          '@nestjs/websockets/socket-module',
          '@sap/hana-client',
          'better-sqlite3',
          'cache-manager',
          'cardinal',
          'class-transformer/storage',
          'hdb-pool',
          'ioredis',
          'mongodb',
          'mssql',
          'mysql',
          'oracledb',
          'pg',
          'pg-query-stream',
          'pg-native',
          'react-native-sqlite-storage',
          'redis',
          'sql.js',
          'sqlite3',
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
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_WP_BUNDLE': true,
    }),
  ],
  ignoreWarnings:
  [
    /the request of a dependency is an expression/,
  ],
/*
  performance:
  {
    maxEntrypointSize: 1000000000,
    maxAssetSize: 1000000000
  },
*/
}
