/* jshint node: true */
'use strict';

const VersionChecker = require('ember-cli-version-checker');
const clone = require('clone');
const path = require('path');

function addBaseDir(Plugin) {
  let type = typeof Plugin;

  if (type === 'function' && !Plugin.baseDir) {
    Plugin.baseDir = () => __dirname;
  } else if (type === 'object' && Plugin !== null && Plugin.default) {
    addBaseDir(Plugin.default);
  }
}

module.exports = {
  name: 'ember-cli-babel',
  configKey: 'ember-cli-babel',

  init: function() {
    this._super.init && this._super.init.apply(this, arguments);

    let checker = new VersionChecker(this);
    let dep = this.emberCLIChecker = checker.for('ember-cli', 'npm');

    this._shouldShowBabelDeprecations = !dep.lt('2.11.0-beta.2');
  },

  transpileTree(tree) {
    return require('broccoli-babel-transpiler')(tree, this._getBabelOptions());
  },

  setupPreprocessorRegistry: function(type, registry) {
    registry.add('js', {
      name: 'ember-cli-babel',
      ext: 'js',
      toTree: (tree) => this.transpileTree(tree)
    });
  },

  _shouldIncludePolyfill: function() {
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

  _importPolyfill: function(app) {
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
    if (!this._shouldIncludePolyfill()) { return; }

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

    if (this._shouldIncludePolyfill()) {
      this._importPolyfill(app);
    }
  },

  isPluginRequired(pluginName) {
    let targets = this._getTargets();

    // if no targets are setup, assume that all plugins are required
    if (!targets) { return true; }

    const isPluginRequired = require('babel-preset-env').isPluginRequired;
    const pluginList = require('babel-preset-env/data/plugins');

    return isPluginRequired(targets, pluginList[pluginName]);
  },

  _getAddonOptions: function() {
    return (this.parent && this.parent.options) || (this.app && this.app.options) || {};
  },

  _getProvidedBabelConfig: function() {
    if (this._cachedProvidedConfig) {
      return this._cachedProvidedConfig;
    }

    let parentName;

    if (this.parent) {
      if (typeof this.parent.name === 'function') {
        parentName = this.parent.name();
      } else {
        parentName = this.parent.name;
      }
    }

    let addonOptions = this._getAddonOptions();
    let babelOptions = clone(addonOptions.babel || {});

    // used only to support using ember-cli-babel@6 at the
    // top level (app or addon during development) on ember-cli
    // older than 2.13
    //
    // without this, we mutate the same shared `options.babel.plugins`
    // that is used to transpile internally (via `_prunedBabelOptions`
    // in older ember-cli versions)
    let babel6Options = clone(addonOptions.babel6 || {});


    let options;
    // options.modules is set only for things assuming babel@5 usage
    if (babelOptions.modules) {
      // using babel@5 configuration with babel@6
      // without overriding here we would trigger
      // an error
      options = Object.assign({}, babel6Options);
    } else {
      // shallow merge both babelOptions and babel6Options
      // (plugins/postTransformPlugins are handled separately)
      options = Object.assign({}, babelOptions, babel6Options);
    }

    let plugins = [].concat(babelOptions.plugins, babel6Options.plugins).filter(Boolean);
    let postTransformPlugins = [].concat(babelOptions.postTransformPlugins, babel6Options.postTransformPlugins).filter(Boolean);

    this._cachedProvidedConfig =  { options, plugins, postTransformPlugins };

    return this._cachedProvidedConfig;
  },

  _getBabelOptions() {
    let providedConfig = this._getProvidedBabelConfig();
    let shouldCompileModules = this._shouldCompileModules();

    let options = {};
    let userPlugins = providedConfig.plugins;
    let userPostTransformPlugins = providedConfig.postTransformPlugins;

    options.plugins = [].concat(
      userPlugins,
      shouldCompileModules && this._getModulesPlugin(),
      this._getPresetEnvPlugins(),
      userPostTransformPlugins
    ).filter(Boolean);
    options.moduleIds = true;

    if (shouldCompileModules) {
      options.resolveModuleSource = require('amd-name-resolver').moduleResolve;
    }

    options.highlightCode = false;

    return options;
  },

  _getPresetEnvPlugins() {
    let providedConfig = this._getProvidedBabelConfig();
    let options = providedConfig.options;

    let targets = this._getTargets();
    let browsers = targets && targets.browsers;
    let presetOptions = Object.assign({}, options, {
      modules: false,
      targets: { browsers },
    });

    let presetEnvPlugins = this._presetEnv(null, presetOptions).plugins;

    presetEnvPlugins.forEach(function(pluginArray) {
      let Plugin = pluginArray[0];
      addBaseDir(Plugin);
    });

    return presetEnvPlugins;
  },

  _presetEnv() {
    const presetEnv = require('babel-preset-env').default;

    return presetEnv.apply(null, arguments);
  },

  _getTargets() {
    return this.project && this.project.targets && this.project.targets;
  },

  _getModulesPlugin() {
    const ModulesTransform = require('babel-plugin-transform-es2015-modules-amd');

    addBaseDir(ModulesTransform);

    return [
      [ModulesTransform, { noInterop: true }],
    ];
  },

  _shouldCompileModules() {
    let addonOptions = this._getAddonOptions();

    if (addonOptions['ember-cli-babel'] && 'compileModules' in addonOptions['ember-cli-babel']) {
      return addonOptions['ember-cli-babel'].compileModules;
    } else if (addonOptions.babel && 'compileModules' in addonOptions.babel) {
      if (this._shouldShowBabelDeprecations && !this._compileModulesDeprecationPrinted) {
        this._compileModulesDeprecationPrinted = true;
        // we can use writeDeprecateLine() here because the warning will only be shown on newer Ember CLIs
        this.ui.writeDeprecateLine('Putting the "compileModules" option in "babel" is deprecated, please put it in "ember-cli-babel" instead.');
      }

      return addonOptions.babel.compileModules;
    } else {
      return this.emberCLIChecker.gt('2.12.0-alpha.1');
    }
  },

};
