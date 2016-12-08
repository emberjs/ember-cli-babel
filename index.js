/* jshint node: true */
'use strict';

var VersionChecker = require('ember-cli-version-checker');
var clone     = require('clone');
var path      = require('path');
var resolve   = require('resolve');

module.exports = {
  name: 'ember-cli-babel',
  configKey: 'ember-cli-babel',

  init: function() {
    this._super.init && this._super.init.apply(this, arguments);

    var checker = new VersionChecker(this);
    var dep = checker.for('ember-cli', 'npm');

    this._shouldShowBabelDeprecations = !dep.lt('2.11.0-beta.2');
  },

  setupPreprocessorRegistry: function(type, registry) {
    var addon = this;

    registry.add('js', {
      name: 'ember-cli-babel',
      ext: 'js',
      toTree: function(tree) {
        return require('broccoli-babel-transpiler')(tree, addon._getBabelOptions());
      }
    });
  },

  shouldIncludePolyfill: function() {
    var addonOptions = this._getAddonOptions();
    var babelOptions = addonOptions.babel;
    var customOptions = addonOptions['ember-cli-babel'];

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
    if (this.import) {  // support for ember-cli >= 2.7
      this.import('vendor/browser-polyfill.js', { prepend: true });
    } else if (app.import) { // support ember-cli < 2.7
      app.import('vendor/browser-polyfill.js', { prepend: true });
    } else {
      console.warn('Please run: ember install ember-cli-import-polyfill');
    }
  },

  treeForVendor: function() {
    if (!this.shouldIncludePolyfill()) { return; }

    // Find babel-core's browser polyfill and use its directory as our vendor tree
    var transpilerRoot = path.dirname(resolve.sync('broccoli-babel-transpiler'));
    var polyfillDir = path.dirname(resolve.sync('babel-core/browser-polyfill', { basedir: transpilerRoot }));
    var Funnel = require('broccoli-funnel');
    return new Funnel(polyfillDir, {
      files: ['browser-polyfill.js']
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
    var parentName;

    if (this.parent) {
      if (typeof this.parent.name === 'function') {
        parentName = this.parent.name();
      } else {
        parentName = this.parent.name;
      }
    }

    var addonOptions = this._getAddonOptions();
    var options = clone(addonOptions.babel || {});

    options.highlightCode = false;

    return options;
  },
};
