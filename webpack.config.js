const path = require("path")
const webpack = require('webpack')
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
    clean: true,
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
                dtoFileNameSuffix: ['.dto.ts'],
                classValidatorShim: true,
                introspectComments: true,
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
        // "Fixes" build issue as suggested by @[linsolas](https://github.com/linsolas)
        //  https://github.com/nestjs/terminus/issues/1423#issue-1002145070
        test: /@nestjs\/terminus\/dist\/utils\/.*\.(ts|js\.map)$/,
        loader: 'null-loader',
      },
      {
        test: /\.js$/,
        loader: 'string-replace-loader',
        options: {
          multiple: [
            {
              search: "new Buffer(",
              replace: "Buffer.from(",
              strict: false,
            },
          ]
        }
      },
      {
        // pdfkit loads the standard fonts at runtime with a createRequire() that webpack can't follow
        test: /pdfkit\/js\/pdfkit\.js$/,
        loader: 'string-replace-loader',
        options: {
          search: "require\\$1\\('#standard-fonts/(\\w+)'\\)",
          replace: "require('pdfkit/standard-fonts/$1')",
          flags: 'g',
          strict: true,
        },
      },
      {
        test: /mysql2\/lib\/parsers\/string\.js$/,
        loader: 'string-replace-loader',
        options: {
          multiple: [
            {
              search: "exports.decode = function (buffer, encoding, start, end, options) {\n  if (hasFastSlices) {",
              replace: "exports.decode = function (buffer, encoding, start, end, options) {\n  if (!encoding || encoding == 'undefined') encoding = 'utf8'\n  if (hasFastSlices) {",
              strict: true,
            },
            {
              search: "exports.encode = function (string, encoding, options) {\n  if (Buffer.isEncoding(encoding)) {",
              replace: "exports.encode = function (string, encoding, options) {\n  if (!encoding || encoding == 'undefined') encoding = 'utf8'\n  if (Buffer.isEncoding(encoding)) {",
              strict: true,
            },
          ]
        }
      },
      {
        // bytecode (bytenode) strips source, so Function.prototype.toString() no longer
        // returns "class ...". Nest's isMiddlewareClass source-sniffs for that, misdetects
        // class middleware as functional and calls it without 'new'. Detect via prototype.use
        // instead (the same signal Nest's own fallback uses), keeping toString as fallback.
        test: /@nestjs\/core\/middleware\/utils\.js$/,
        loader: 'string-replace-loader',
        options: {
          search: "export function isMiddlewareClass(middleware) {\n    const middlewareStr = middleware.toString();",
          replace: "export function isMiddlewareClass(middleware) {\n    if (typeof middleware === 'function' && middleware.prototype && typeof middleware.prototype.use === 'function') {\n        return true;\n    }\n    const middlewareStr = middleware.toString();",
          strict: true,
        },
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
    __dirname: 'eval-only',
  },
  plugins:
  [
    //new webpack.ProvidePlugin({ 'openapi': '@nestjs/swagger', }),
    // fold async chunks into the single server.js so nothing ships as readable
    // .js alongside the bytecode (the loaded .jsc)
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
    new webpack.IgnorePlugin({
      checkResource: function(resource)
      {
        const lazyImports =
        [
          '@fastify/static',
          '@google-cloud/spanner',
          '@mikro-orm/core',
          '@nestjs/microservices/microservices-module',
          '@nestjs/microservices/microservices-module.js',
          '@nestjs/microservices',
          '@nestjs/mongoose',
          '@nestjs/sequelize/dist/common/sequelize.utils',
          '@nestjs/terminus',
          '@nestjs/websockets/socket-module',
          '@nestjs/websockets/socket-module.js',
          '@sap/hana-client',
          '@sap/hana-client/extension/Stream',
          'better-sqlite3',
          'cache-manager',
          'cardinal',
          'class-transformer/storage',
          'fsevents',
          'graphql',
          'handlebars',
          'hbs',
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
          // bytenode runtime vendored next to the bytecode; prod/ ships without
          // node_modules, so the loader stub requires it from here at runtime
          from: './node_modules/bytenode/lib',
          to: './bytenode',
        },
        {
          from: './node_modules/sd-notify/build/Release/notify.node',
          to: './build/notify.node',
        },
        {
          from: './node_modules/winston-syslog/node_modules/unix-dgram/build/Release/unix_dgram.node',
          to: './build/unix_dgram.node',
        },
        {
          from: './package.json',
          to: './package.json',
        },
        {
          from: './public/css',
          to: './css',
        },
        {
          from: './public/fonts',
          to: './fonts',
        },
        {
          from: './src/localisation',
          to: './localisation',
        },
        {
          from: './src/api/templates/invoices/defaults',
          to: './invoice-templates',
        },
        'node_modules/swagger-ui-dist/swagger-ui.css',
        'node_modules/swagger-ui-dist/swagger-ui-bundle.js',
        'node_modules/swagger-ui-dist/swagger-ui-standalone-preset.js',
        'node_modules/swagger-ui-dist/favicon-16x16.png',
        'node_modules/swagger-ui-dist/favicon-32x32.png'
      ],
    }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_WP_BUNDLE: JSON.stringify(true),
      }
    }),
  ],
  ignoreWarnings:
  [
    /the request of a dependency is an expression/,
    {
      module: /node_modules\/handlebars\/lib\/index\.js/,
      message: /require\.extensions is not supported by webpack/,
    },
  ],
/*
  performance:
  {
    maxEntrypointSize: 1000000000,
    maxAssetSize: 1000000000
  },
*/
}
