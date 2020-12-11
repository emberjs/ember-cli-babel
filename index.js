'use strict';

const VersionChecker = require('ember-cli-version-checker');
const clone = require('clone');
const path = require('path');
const semver = require('semver');

const defaultShouldIncludeHelpers = require('./lib/default-should-include-helpers');
const getBabelOptions = require('./lib/get-babel-options');
const findApp = require('./lib/find-app');

const APP_BABEL_RUNTIME_VERSION = new WeakMap();

let count = 0;
let instanceCounter = 0;

const emberCLIBabelProto = {
  name: 'ember-cli-babel',
  configKey: 'ember-cli-babel',

  init() {
    this._super.init && this._super.init.apply(this, arguments);

    let checker = new VersionChecker(this);
    let dep = checker.for('ember-cli', 'npm');

    if (dep.lt('2.13.0')) {
      throw new Error(`ember-cli-babel@7 (used by ${this._parentName()} at ${this.parent.root}) cannot be used by ember-cli versions older than 2.13, you used ${dep.version}`);
    }

    this.instanceId = instanceCounter++;
  },

  buildBabelOptions(_config) {
    let config = _config || this._getAddonOptions();
    return getBabelOptions(config, this);
  },

  _debugTree() {
    if (!this._cachedDebugTree) {
      this._cachedDebugTree = require('broccoli-debug').buildDebugCallback(`ember-cli-babel:${this._parentName()}`);
    }

    return this._cachedDebugTree.apply(null, arguments);
  },

  transpileTree(inputTree, _config) {
    let config = _config || this._getAddonOptions();
    let description = `000${++count}`.slice(-3);
    let postDebugTree = this._debugTree(inputTree, `${description}:input`);

    let options = this.buildBabelOptions(config);
    let output;
    if (this._shouldDoNothing(options)) {
      output = postDebugTree;
    } else {
      let BabelTranspiler = require('broccoli-babel-transpiler');
      let transpilationInput = postDebugTree;

      if (this._shouldHandleTypeScript(config)) {
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
      ext: this._getExtensions(this._getAddonOptions()),
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

  _shouldIncludeHelpers(options) {
    let appOptions = this._getAppOptions();
    let customOptions = appOptions['ember-cli-babel'];

    let shouldIncludeHelpers = false;

    if (!this._shouldCompileModules(options)) {
      // we cannot use external helpers if we are not transpiling modules
      return false;
    } else if (customOptions && 'includeExternalHelpers' in customOptions) {
      shouldIncludeHelpers = customOptions.includeExternalHelpers === true;
    } else {
      // Check the project to see if we should include helpers based on heuristics.
      shouldIncludeHelpers = defaultShouldIncludeHelpers(this.project);
    }

    let appEmberCliBabelPackage = this.project.addons.find(a => a.name === 'ember-cli-babel').pkg;
    let appEmberCliBabelVersion = appEmberCliBabelPackage && appEmberCliBabelPackage.version;

    if (appEmberCliBabelVersion && semver.gte(appEmberCliBabelVersion, '7.3.0-beta.1')) {
      return shouldIncludeHelpers;
    } else if (shouldIncludeHelpers) {
      this.project.ui.writeWarnLine(
        `${this._parentName()} attempted to include external babel helpers to make your build size smaller, but your root app's ember-cli-babel version is not high enough. Please update ember-cli-babel to v7.3.0-beta.1 or later.`
      );
    }

    return false;
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
    let shouldIncludeHelpers = isRootBabel && this._shouldIncludeHelpers(this._getAppOptions());

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

  _parentName() {
    let parentName;

    if (this.parent) {
      if (typeof this.parent.name === 'function') {
        parentName = this.parent.name();
      } else {
        parentName = this.parent.name;
      }
    }

    return parentName;
  },

  _getExtensions(config) {
    let shouldHandleTypeScript = this._shouldHandleTypeScript(config);
    let emberCLIBabelConfig = config['ember-cli-babel'] || {};
    return emberCLIBabelConfig.extensions || (shouldHandleTypeScript ? ['js', 'ts'] : ['js']);
  },

  _shouldHandleTypeScript(config) {
      let emberCLIBabelConfig = config['ember-cli-babel'] || {};
      if (typeof emberCLIBabelConfig.enableTypeScriptTransform === 'boolean') {
        return emberCLIBabelConfig.enableTypeScriptTransform;
      }
      let typeScriptAddon = this.parent.addons
        && this.parent.addons.find(a => a.name === 'ember-cli-typescript');
      return typeof typeScriptAddon !== 'undefined'
        && semver.gte(typeScriptAddon.pkg.version, '4.0.0-alpha.1');
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
    return this._shouldCompileModules(this._getAddonOptions());
  },

  // will use any provided configuration
  _shouldCompileModules(options) {
    let addonOptions = options['ember-cli-babel'];

    if (addonOptions && 'compileModules' in addonOptions) {
      return addonOptions.compileModules;
    } else {
      return semver.gt(this.project.emberCLIVersion(), '2.12.0-alpha.1');
    }
  },

  // detect if running babel would do nothing... and do nothing instead
  _shouldDoNothing(options) {
    return !options.sourceMaps && !options.plugins.length;
  },

  root: __dirname,
  pkg: require('./package.json'),
};

let EmberCLIBabelClass;

function getBabelClass(project) {
  if (EmberCLIBabelClass) {
    return EmberCLIBabelClass;
  }

  let internalAddonPath = project.addonPackages['broccoli-serve-files'].path;
  let addonModelPath = path.join(internalAddonPath, '../../../../models/addon');
  let Addon = require(addonModelPath);

  EmberCLIBabelClass = Addon.extend(emberCLIBabelProto);

  return EmberCLIBabelClass;
}

let INSTANCE_CACHE = new WeakMap();

function getInstance(parent, project) {
  let instance = INSTANCE_CACHE.get(project);
  if (instance !== undefined) {
    return instance;
  }

  let SubClass = getBabelClass(project);

  instance = new SubClass(parent, project);
  INSTANCE_CACHE.set(project, instance);

  return instance;
}

module.exports = function(parent, project) {
  let context = {};
  let instance;

  let proxy = new Proxy(context, {
    get(target, key, receiver) {
      switch (key) {
        case 'setupPreprocessorRegistry':
          // always register a processor, that will **lazily** use our instance

          return (type, registry) => {
            registry.add('js', {
              name: 'ember-cli-babel',
              // TODO: use new utility methods instead of hard coding
              ext: ['js','ts'],
              toTree: (tree) => instance.transpileTree(tree)
            });
          };
        case 'included':
          // determine if we can use a shared singleton, or not

          break;
        default:
          return instance[key];
      }
    },

    set(target, key, receiver) {
      // TODO: this is almost certainly incorrect, but it at least gives us
      // _some_ information about what is being set
      throw new Error(`[ember-cli-babel] cannot set ${key}`);
    }
  });

  return proxy;

}
