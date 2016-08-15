/* jshint node: true */
'use strict';

var checker   = require('ember-cli-version-checker');
var clone     = require('clone');
var path      = require('path');
var resolve   = require('resolve');

module.exports = {
  name: 'ember-cli-babel',

  shouldSetupRegistryInIncluded: function() {
    return !checker.isAbove(this, '0.2.0');
  },

  setupPreprocessorRegistry: function(type, registry) {
    var addon = this;

    registry.add('js', {
      name: 'ember-cli-babel',
      ext: 'js',
      toTree: function(tree) {
        return require('broccoli-babel-transpiler')(tree, getBabelOptions(addon));
      }
    });
  },

  shouldIncludePolyfill: function() {
    var options = getAddonOptions(this);
    return options.includePolyfill === true;
  },

  importPolyfill: function(app) {
    if (this.import) {  // support for ember-cli >= 2.7
      this.import('vendor/browser-polyfill.js', { prepend: true });
    } else if (app.import) { // support ember-cli < 2.7
      app.import('vendor/browser-polyfill.js', { prepend: true });
    } else {
      console.warn('Please run: ember install ember-cli-import-polyfill')
    }
  },

  treeFor: function(name) {
    if (name !== 'vendor') { return; }
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

    if (this.shouldSetupRegistryInIncluded()) {
      this.setupPreprocessorRegistry('parent', app.registry);
    }

    if (this.shouldIncludePolyfill()) {
      this.importPolyfill(app);
    }
  }
};

function getAddonOptions(addonContext) {
  var baseOptions = (addonContext.parent && addonContext.parent.options) || (addonContext.app && addonContext.app.options);
  return baseOptions && baseOptions.babel || {};
}

function getBabelOptions(addonContext) {
  var options = clone(getAddonOptions(addonContext));
  var ui = addonContext.ui;

  // pass a console object that wraps the addon's `UI` object
  options.console = {
    log: function(message) {
      // fallback needed for support of ember-cli < 2.2.0
      if (ui.writeInfoLine) {
        ui.writeInfoLine(message);
      } else {
        ui.writeLine(message, 'INFO');
      }
    },

    warn: function(message) {
      // fallback needed for support of ember-cli < 2.2.0
      if (ui.writeWarnLine) {
        ui.writeWarnLine(message);
      } else {
        ui.writeLine(message, 'WARN');
      }
    },

    error: function(message) {
      // fallback needed for support of ember-cli < 2.2.0
      if (ui.writeError) {
        ui.writeError(message);
      } else {
        ui.writeLine(message, 'ERROR');
      }
    }
  };

  // Ensure modules aren't compiled unless explicitly set to compile
  options.blacklist = options.blacklist || ['es6.modules'];

  // do not enable non-standard transforms
  if (!('nonStandard' in options)) {
    options.nonStandard = false;
  }

  // Don't include the `includePolyfill` flag, since Babel doesn't care
  delete options.includePolyfill;

  if (options.compileModules === true) {
    if (options.blacklist.indexOf('es6.modules') >= 0) {
      options.blacklist.splice(options.blacklist.indexOf('es6.modules'), 1);
    }

    delete options.compileModules;
  } else {
    if (options.blacklist.indexOf('es6.modules') < 0) {
      options.blacklist.push('es6.modules');
    }
  }

  // Ember-CLI inserts its own 'use strict' directive
  options.blacklist.push('useStrict');
  options.highlightCode = false;

  return options;
}
