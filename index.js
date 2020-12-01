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
const path = require('path');
const fs = require('fs'); 
const getBabelOptions = require('./lib/get-babel-options');
const findApp = require('./lib/find-app');

const APP_BABEL_RUNTIME_VERSION = new WeakMap();

let count = 0;

module.exports = {
  name: 'ember-cli-babel',
  configKey: 'ember-cli-babel',

  init() {
    this._super.init && this._super.init.apply(this, arguments);

    let checker = new VersionChecker(this);
    let dep = checker.for('ember-cli', 'npm');

    if (dep.lt('2.13.0')) {
      throw new Error(`ember-cli-babel@7 (used by ${_parentName(this.parent)} at ${this.parent.root}) cannot be used by ember-cli versions older than 2.13, you used ${dep.version}`);
    }
  },

  buildBabelOptions(_config) {
    let config = _config || this._getAddonOptions();
    return getBabelOptions(config, this);
  },

  _debugTree() {
    if (!this._cachedDebugTree) {
      this._cachedDebugTree = require('broccoli-debug').buildDebugCallback(`ember-cli-babel:${_parentName(this.parent)}`);
    }

    return this._cachedDebugTree.apply(null, arguments);
  },

  /**
   * Default babel options
   * @param {*} config 
   */
  _getDefaultBabelOptions(config = {}) {
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
       filterExtensions: _getExtensions(config, this.parent),
       plugins: [],
       presets: []
     };

     if (shouldCompileModules) {
       options.moduleIds = true;
       options.getModuleId = require("./lib/relative-module-paths").getRelativeModulePath;
     }

     options.highlightCode = _shouldHighlightCode(this.parent);
     options.babelrc = false;

     return options;
  },

  transpileTree(inputTree, _config) {

    let config = _config || this._getAddonOptions();
    let description = `000${++count}`.slice(-3);
    let postDebugTree = this._debugTree(inputTree, `${description}:input`);
    let options = this._getDefaultBabelOptions(config);
    let output;
    const babelConfigPath = path.resolve(this.parent.root, '.babelrc.js');
    const isBabelConfigFilePresent = fs.existsSync(babelConfigPath)
    
    if (isBabelConfigFilePresent) {
      options = Object.assign({}, options, {
        "presets":[ require.resolve(babelConfigPath) ],
      });
    } else {
      options = Object.assign({}, options, this.buildBabelOptions(config));
    }

    if (!isBabelConfigFilePresent && this._shouldDoNothing(options)) {
      output = postDebugTree;
    } else {
      let BabelTranspiler = require('broccoli-babel-transpiler');
      let transpilationInput = postDebugTree;

      if (_shouldHandleTypeScript(config, this.parent)) {
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
      ext: _getExtensions(this._getAddonOptions(), this.parent),
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

    return this.transpileTree(babelHelpersTree, {
      'ember-cli-babel': {
        // prevents the helpers from being double transpiled, and including themselves
        disablePresetEnv: true
      }
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
