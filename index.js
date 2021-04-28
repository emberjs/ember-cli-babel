'use strict';

const {
  _shouldCompileModules,
  _shouldIncludeHelpers,
  _shouldHandleTypeScript,
  _getExtensions,
  _parentName,
  _shouldHighlightCode,
} = require("./lib/babel-options-util");

const VersionChecker = require('ember-cli-version-checker');
const clone = require('clone');
const babel = require('@babel/core');
const path = require('path');
const getBabelOptions = require('./lib/get-babel-options');
const findApp = require('./lib/find-app');
const emberPlugins = require('./lib/ember-plugins');

const APP_BABEL_RUNTIME_VERSION = new WeakMap();
const PROJECTS_WITH_VALID_EMBER_CLI = new WeakSet();

let count = 0;

module.exports = {
  name: 'ember-cli-babel',
  configKey: 'ember-cli-babel',
  // Note: This is not used internally for this addon, this is added for users to import this function for getting the ember specific
  // babel plugins. Eg: adding ember specific babel plugins in their babel.config.js.
  buildEmberPlugins: emberPlugins,

  init() {
    this._super.init && this._super.init.apply(this, arguments);

    if (!PROJECTS_WITH_VALID_EMBER_CLI.has(this.project)) {
      let checker = new VersionChecker(this);
      let dep = checker.for('ember-cli', 'npm');

      if (dep.lt('2.13.0')) {
        throw new Error(`ember-cli-babel@7 (used by ${_parentName(this.parent)} at ${this.parent.root}) cannot be used by ember-cli versions older than 2.13, you used ${dep.version}`);
      }

      PROJECTS_WITH_VALID_EMBER_CLI.add(this.project);
    }
  },

  buildBabelOptions(configOrType, _config) {
    let resultType;

    if (typeof configOrType !== 'string') {
      _config = configOrType;
      resultType = 'broccoli';
    } else if (configOrType === 'broccoli') {
      resultType = 'broccoli';
    } else if (configOrType === 'babel') {
      resultType = 'babel';
    }

    let config = _config || this._getAddonOptions();

    const customAddonConfig = config['ember-cli-babel'];
    const shouldUseBabelConfigFile = customAddonConfig && customAddonConfig.useBabelConfig;

    let options;

    if (shouldUseBabelConfigFile) {
      let babelConfig = babel.loadPartialConfig({
        root: this.parent.root,
        rootMode: 'root',
        envName: process.env.EMBER_ENV || process.env.BABEL_ENV || process.env.NODE_ENV || "development",
      });

      if (babelConfig.config === undefined) {
        // should contain the file that we used for the config,
        // if it is undefined then we didn't find any config and
        // should error

        throw new Error(
          "Missing babel config file in the project root. Please double check if the babel config file exists or turn off the `useBabelConfig` option in your ember-cli-build.js file."
        );
      }

      // If the babel config file is found, then pass the path into the options for the transpiler
      // parse and leverage the same.
      options = { configFile: babelConfig.config };
    } else {
      options = getBabelOptions(config, this);
    }

    if (resultType === 'babel') {
      return options;
    } else {
      // legacy codepath
      return Object.assign({}, this._buildBroccoliBabelTranspilerOptions(config), options);
    }
  },

  _debugTree() {
    if (!this._cachedDebugTree) {
      this._cachedDebugTree = require('broccoli-debug').buildDebugCallback(`ember-cli-babel:${_parentName(this.parent)}`);
    }

    return this._cachedDebugTree.apply(null, arguments);
  },

  getSupportedExtensions(config = {}) {
    return _getExtensions(config, this.parent, this.project);
  },

  _buildBroccoliBabelTranspilerOptions(config = {}) {
    let emberCLIBabelConfig = config["ember-cli-babel"];

    let providedAnnotation;
    let throwUnlessParallelizable;
    let sourceMaps = false;
    let shouldCompileModules = _shouldCompileModules(config, this.project);

    if (emberCLIBabelConfig) {
      providedAnnotation = emberCLIBabelConfig.annotation;
      throwUnlessParallelizable = emberCLIBabelConfig.throwUnlessParallelizable;
    }

    if (config.babel && "sourceMaps" in config.babel) {
      sourceMaps = config.babel.sourceMaps;
    }

    let options = {
      annotation: providedAnnotation || `Babel: ${_parentName(this.parent)}`,
      sourceMaps,
      throwUnlessParallelizable,
      filterExtensions: this.getSupportedExtensions(config),
      plugins: []
    };

    if (shouldCompileModules) {
      options.moduleIds = true;
      options.getModuleId = require("./lib/relative-module-paths").getRelativeModulePath;
    }

    options.highlightCode = _shouldHighlightCode(this.parent);
    options.babelrc = false;
    options.configFile = false;

    return options;
  },

  transpileTree(inputTree, _config) {
    let config = _config || this._getAddonOptions();
    let description = `000${++count}`.slice(-3);
    let postDebugTree = this._debugTree(inputTree, `${description}:input`);
    let options = Object.assign({}, this._buildBroccoliBabelTranspilerOptions(config), this.buildBabelOptions('babel', config));
    let output;

    const customAddonConfig = config['ember-cli-babel'];
    const shouldUseBabelConfigFile = customAddonConfig && customAddonConfig.useBabelConfig;

    if (!shouldUseBabelConfigFile && this._shouldDoNothing(options)) {
      output = postDebugTree;
    } else {
      let BabelTranspiler = require('broccoli-babel-transpiler');
      let transpilationInput = postDebugTree;

      if (_shouldHandleTypeScript(config, this.parent, this.project)) {
        let Funnel = require('broccoli-funnel');
        let inputWithoutDeclarations = new Funnel(transpilationInput, { exclude: ['**/*.d.ts'] });
        transpilationInput = this._debugTree(inputWithoutDeclarations, `${description}:filtered-input`);
      }

      output = new BabelTranspiler(transpilationInput, options);
    }

    return this._debugTree(output, `${description}:output`);
  },

  setupPreprocessorRegistry(type, registry) {
    registry.add('js', {
      name: 'ember-cli-babel',
      ext: _getExtensions(this._getAddonOptions(), this.parent, this.project),
      toTree: (tree) => this.transpileTree(tree)
    });
  },

  _shouldIncludePolyfill() {
    let addonOptions = this._getAddonOptions();
    let customOptions = addonOptions['ember-cli-babel'];

    if (customOptions && 'includePolyfill' in customOptions) {
      return customOptions.includePolyfill === true;
    } else {
      return false;
    }
  },

  _importPolyfill(app) {
    let polyfillPath = 'vendor/babel-polyfill/polyfill.js';

    if (this.import) {  // support for ember-cli >= 2.7
      this.import(polyfillPath, { prepend: true });
    } else if (app.import) { // support ember-cli < 2.7
      app.import(polyfillPath, { prepend: true });
    } else {
      // eslint-disable-next-line no-console
      console.warn('Please run: ember install ember-cli-import-polyfill');
    }
  },

  _getHelperVersion() {
    if (!APP_BABEL_RUNTIME_VERSION.has(this.project)) {
      let checker = new VersionChecker(this.project);
      APP_BABEL_RUNTIME_VERSION.set(this.project, checker.for('@babel/runtime', 'npm').version);
    }

    return APP_BABEL_RUNTIME_VERSION.get(this.project);
  },

  _getHelpersPlugin() {
    return [
      [
        require.resolve('@babel/plugin-transform-runtime'),
        {
          version: this._getHelperVersion(),
          regenerator: false,
          useESModules: true
        }
      ]
    ]
  },

  treeForAddon() {
    // Helpers are a global config, so only the root application should bother
    // generating and including the file.
    let isRootBabel = this.parent === this.project;
    let shouldIncludeHelpers = isRootBabel && _shouldIncludeHelpers(this._getAppOptions(), this);

    if (!shouldIncludeHelpers) { return; }

    const path = require('path');
    const Funnel = require('broccoli-funnel');
    const UnwatchedDir = require('broccoli-source').UnwatchedDir;

    const babelHelpersPath = path.dirname(require.resolve('@babel/runtime/package.json'));

    let babelHelpersTree = new Funnel(new UnwatchedDir(babelHelpersPath), {
      srcDir: 'helpers/esm',
      destDir: '@babel/runtime/helpers/esm'
    });

    const transpiledHelpers = this.transpileTree(babelHelpersTree, {
      'ember-cli-babel': {
        // prevents the helpers from being double transpiled, and including themselves
        disablePresetEnv: true
      }
    });

    return new Funnel(transpiledHelpers, {
      destDir: this.moduleName(),
    });
  },

  treeForVendor() {
    if (!this._shouldIncludePolyfill()) return;

    const Funnel = require('broccoli-funnel');
    const UnwatchedDir = require('broccoli-source').UnwatchedDir;

    // Find babel-core's browser polyfill and use its directory as our vendor tree
    let polyfillDir = path.dirname(require.resolve('@babel/polyfill/dist/polyfill'));

    let polyfillTree = new Funnel(new UnwatchedDir(polyfillDir), {
      destDir: 'babel-polyfill'
    });

    return polyfillTree;
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

    const isPluginRequired = require('@babel/helper-compilation-targets').isRequired;
    return isPluginRequired(pluginName, targets);
  },

  _getAddonOptions() {
    let parentOptions = this.parent && this.parent.options;
    let appOptions = this.app && this.app.options;

    if (parentOptions) {
      let customAddonOptions = parentOptions['ember-cli-babel'];

      if (customAddonOptions && 'includeExternalHelpers' in customAddonOptions) {
        throw new Error('includeExternalHelpers is not supported in addon configurations, it is an app-wide configuration option');
      }
    }

    return parentOptions || appOptions || {};
  },

  _getAppOptions() {
    let app = findApp(this);

    return (app && app.options) || {};
  },

  _getTargets() {
    let targets = this.project && this.project.targets;

    let parser = require('@babel/helper-compilation-targets').default;
    if (typeof targets === 'object' && targets !== null) {
      // babel version 7.10.0 introduced a change that mutates the input:
      // https://github.com/babel/babel/pull/11500
      // copy the object to guard against it, otherwise subsequent calls to
      // _getTargets() will only have a mutated copy and lose all config from `config/targets.js`
      // in the host application.
      // PR to fix this upstream in babel: https://github.com/babel/babel/pull/11648
      const copy = clone(targets);
      return parser(copy);
    } else {
      return targets;
    }
  },

  /*
   * Used to discover if the addon's current configuration will compile modules
   * or not.
   *
   * @public
   * @method shouldCompileModules
   */
  shouldCompileModules() {
    return _shouldCompileModules(this._getAddonOptions(), this.project);
  },

  // detect if running babel would do nothing... and do nothing instead
  _shouldDoNothing(options) {
    return !options.sourceMaps && !options.plugins.length;
  }
};
