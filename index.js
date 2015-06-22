var checker   = require('ember-cli-version-checker');
var clone     = require('clone');
var path      = require('path');
var resolve   = require('resolve');
var Funnel    = require('broccoli-funnel');

module.exports = {
  name: 'ember-cli-babel',

  shouldSetupRegistryInIncluded: function() {
    return !checker.isAbove(this, '0.2.0');
  },

  setupPreprocessorRegistry: function(type, registry) {
    var addon = this;

    if (type === 'parent') {
      this.parentRegistry = registry;
    }

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
    app.import('vendor/browser-polyfill.js', { prepend: true });
  },

  treeFor: function(name) {
    if (name !== 'vendor') { return; }
    if (!this.shouldIncludePolyfill()) { return; }

    // Find babel-core's browser polyfill and use its directory as our vendor tree
    var transpilerRoot = path.dirname(resolve.sync('broccoli-babel-transpiler'));
    var polyfillDir = path.dirname(resolve.sync('babel-core/browser-polyfill', { basedir: transpilerRoot }));

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

  // get all babel-plugins in the registry
  var pluginWrappers = addonContext.parentRegistry.load('babel-plugin');

  // currently only a specific set of babel-plugin's is added to the pipeline:
  // the reason is that if the ember-cli addon "ember-cli-my-addon" needs
  // "babel-plugin-1" and an app uses the "ember-cli-my-addon" but doesn't
  // list the "babel-plugin-1" in its package.json, the "ember-cli-my-addon" is
  // not correctly pre-processed for the app, since "babel-plugin-1" is not
  // available in the build pipeline
  //
  // as a current workaround for this, the allowed plugins are whitelisted
  // here, until a general solution exists. see
  // https://github.com/babel/ember-cli-babel/pull/42 for further context.
  var allowedBabelPlugins = ['ember-cli-htmlbars-inline-precompile'];
  var babelPlugins = pluginWrappers.filter(function(wrapper) {
    // only allow whitelisted plugins
    return allowedBabelPlugins.indexOf(wrapper.name) !== -1;
  });

  babelPlugins = babelPlugins.map(function(wrapper) {
    return wrapper.plugin;
  });

  // add babel-plugins from the registry to the options.plugins
  options.plugins = (options.plugins || []).concat(babelPlugins);

  // Ember-CLI inserts its own 'use strict' directive
  options.blacklist.push('useStrict');
  options.highlightCode = false;

  return options;
}
