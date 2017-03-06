/* jshint node: true */
'use strict';

const VersionChecker = require('ember-cli-version-checker');
const clone = require('clone');
const path = require('path');

module.exports = {
  name: 'ember-cli-babel',
  configKey: 'ember-cli-babel',

  init: function() {
    this._super.init && this._super.init.apply(this, arguments);

    let checker = new VersionChecker(this);
    let dep = checker.for('ember-cli', 'npm');

    this._shouldShowBabelDeprecations = !dep.lt('2.11.0-beta.2');
  },

  setupPreprocessorRegistry: function(type, registry) {
    let addon = this;

    registry.add('js', {
      name: 'ember-cli-babel',
      ext: 'js',
      toTree: function(tree) {
        return require('broccoli-babel-transpiler')(tree, addon._getBabelOptions());
      }
    });
  },

  shouldIncludePolyfill: function() {
    let addonOptions = this._getAddonOptions();
    let babelOptions = addonOptions.babel;
    let customOptions = addonOptions['ember-cli-babel'];

    if (this._shouldShowBabelDeprecations && !this._polyfillDeprecationPrinted &&
      babelOptions && 'includePolyfill' in babelOptions) {

      this._polyfillDeprecationPrinted = true;

      // we can use writeDeprecateLine() here because the warning will only be shown on newer Ember CLIs
      this.ui.writeDeprecateLine(
        'Putting the "includePolyfill" option in "babel" is deprecated, please put it in "ember-cli-babel" instead.');
    }

    if (customOptions && 'includePolyfill' in customOptions) {
      return customOptions.includePolyfill === true;
    } else if (babelOptions && 'includePolyfill' in babelOptions) {
      return babelOptions.includePolyfill === true;
    } else {
      return false;
    }
  },

  importPolyfill: function(app) {
    let polyfillPath = 'vendor/babel-polyfill/polyfill.js';

    if (this.import) {  // support for ember-cli >= 2.7
      this.import(polyfillPath, { prepend: true });
    } else if (app.import) { // support ember-cli < 2.7
      app.import(polyfillPath, { prepend: true });
    } else {
      console.warn('Please run: ember install ember-cli-import-polyfill');
    }
  },

  treeForVendor: function() {
    if (!this.shouldIncludePolyfill()) { return; }

    const Funnel = require('broccoli-funnel');
    const UnwatchedDir = require('broccoli-source').UnwatchedDir;

    // Find babel-core's browser polyfill and use its directory as our vendor tree
    let polyfillDir = path.dirname(require.resolve('babel-polyfill/dist/polyfill'));

    return new Funnel(new UnwatchedDir(polyfillDir), {
      destDir: 'babel-polyfill'
    });
  },

  included: function(app) {
    this._super.included.apply(this, arguments);
    this.app = app;

    if (this.shouldIncludePolyfill()) {
      this.importPolyfill(app);
    }
  },

  _getAddonOptions: function() {
    return (this.parent && this.parent.options) || (this.app && this.app.options) || {};
  },

  _getBabelOptions: function() {
    let parentName;

    if (this.parent) {
      if (typeof this.parent.name === 'function') {
        parentName = this.parent.name();
      } else {
        parentName = this.parent.name;
      }
    }

    let addonOptions = this._getAddonOptions();
    let options = clone(addonOptions.babel || {});

    if (options.modules) {
      // using babel@5 configuration with babel@6
      // without overriding here we would trigger
      // an error
      options = {};
    }

    let browsers = this.project && this.project.targets && this.project.targets.browsers;
    const presetEnv = require('babel-preset-env').default;
    options.plugins = presetEnv(null, {
      browsers,
      modules: 'amd',
    }).plugins;

    options.moduleIds = true;
    options.resolveModuleSource = require('amd-name-resolver').moduleResolve;

    options.highlightCode = false;

    return options;
  },
};
