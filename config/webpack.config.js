const { resolve } = require('path');
const webpackMerge = require('webpack-merge');
const { dev, prod } = require('@ionic/app-scripts/config/webpack.config');

const customConfig = {
  resolve: {
    alias: {
      '@addon': resolve('./src/addon'),
      '@app': resolve('./src/app'),
      '@classes': resolve('./src/classes'),
      '@core': resolve('./src/core'),
      '@providers': resolve('./src/providers'),
      '@components': resolve('./src/components'),
      '@directives': resolve('./src/directives'),
      '@pipes': resolve('./src/pipes')
    }
  },
  externals: [
    (function () {
        var IGNORES = ["fs","child_process","electron","path","assert","cluster","crypto","dns","domain","events","http","https","net","os","process","punycode","querystring","readline","repl","stream","string_decoder","tls","tty","dgram","url","util","v8","vm","zlib"];
        return function (context, request, callback) {
            if (IGNORES.indexOf(request) >= 0) {
                return callback(null, "require('" + request + "')");
            }
            return callback();
        };
    })()
  ],
  module: {
    loaders: [
      {
        test: /\.node$/,
        use: 'node-loader'
      }
    ]
  }
};

module.exports = {
  dev: webpackMerge(dev, customConfig),
  prod: webpackMerge(prod, customConfig),
}
