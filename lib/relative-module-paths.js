'use strict';

const path = require('path');
const ensurePosix = require('ensure-posix-path');
const { moduleResolve } = require('amd-name-resolver');

const BASE_DIR = path.resolve(`${__dirname}/..`);

function getRelativeModulePath(modulePath) {
  return ensurePosix(path.relative(process.cwd(), modulePath));
}

/**
 * This function is used in babel-plugin-module-resolver,
 * which is configured in lib/babel-options-util and lib/ember-plugins.
 *
 * By default, babel-plugin-module-resolver handles extensions,
 * and by default will strip extensions.
 *
 * However, we opted out of that when we passed `resolvePath`
 * to the plugin.
 * So now we have to strip extensions ourselves.
 *
 * This came up in https://github.com/emberjs/ember-cli-babel/pull/530
 * because until more recent(ish) versions of node, commonjs requires would not specify the extension.
 * _so we got lucky_.
 */
function resolveRelativeModulePath(name, child) {
  let relativeModulePath = getRelativeModulePath(child);
  let resolved = moduleResolve(name, relativeModulePath);

  // AMD / loader.js does not support extensions
  // (the result of this goes right into AMD's define(here, [....]))
  return resolved.replace(/\.js$/, '');
}

module.exports = {
  getRelativeModulePath,
  resolveRelativeModulePath
};

Object.keys(module.exports).forEach((key) => {
  module.exports[key].baseDir = () => BASE_DIR;

  module.exports[key]._parallelBabel = {
    requireFile: __filename,
    useMethod: key
  };
});
