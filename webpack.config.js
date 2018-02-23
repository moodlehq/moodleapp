const { resolve } = require('path');
const webpackMerge = require('webpack-merge');
const { dev, prod } = require('@ionic/app-scripts/config/webpack.config');

const customConfig = {
  resolve: {
    alias: {
      '@addon': resolve('./src/addon'),
      '@classes': resolve('./src/classes'),
      '@core': resolve('./src/core'),
      '@providers': resolve('./src/providers'),
      '@utils': resolve('./src/providers/utils'),
      '@components': resolve('./src/components'),
      '@directives': resolve('./src/directives/directives.module'),
      '@pipes': resolve('./src/pipes/pipes.module')
    }
  }
};

module.exports = {
  dev: webpackMerge(dev, customConfig),
  prod: webpackMerge(prod, customConfig),
}