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
  }
};

module.exports = {
  dev: webpackMerge(dev, customConfig),
  prod: webpackMerge(prod, customConfig),
}
