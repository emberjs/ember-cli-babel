'use strict';

const co = require('co');
const expect = require('chai').expect;
const MockUI = require('console-ui/mock');
const CoreObject = require('core-object');
const AddonMixin = require('../index');
const path = require('path');
const resolve = require('resolve');
const CommonTags = require('common-tags');
const stripIndent = CommonTags.stripIndent;
const BroccoliTestHelper = require('broccoli-test-helper');
const createBuilder = BroccoliTestHelper.createBuilder;
const createTempDir = BroccoliTestHelper.createTempDir;
const walkSync = require('walk-sync');

let Addon = CoreObject.extend(AddonMixin);

describe('ember-cli-babel', function() {
  const ORIGINAL_EMBER_ENV = process.env.EMBER_ENV;

  beforeEach(function() {
    this.ui = new MockUI();
    let project = { root: __dirname };
    this.addon = new Addon({
      project,
      parent: project,
      ui: this.ui,
    });
  });

  afterEach(function() {
    if (ORIGINAL_EMBER_ENV === undefined) {
      delete process.env.EMBER_ENV;
    } else {
      process.env.EMBER_ENV = ORIGINAL_EMBER_ENV;
    }
  });

  describe('transpileTree', function() {
    this.timeout(0);

    let input;
    let output;
    let subject;

    beforeEach(co.wrap(function* () {
      input = yield createTempDir();
    }));

    afterEach(co.wrap(function* () {
      yield input.dispose();
      yield output.dispose();
    }));

    it("should build", co.wrap(function* () {
      input.write({
        "foo.js": `let foo = () => {};`,
        "bar.js": `let bar = () => {};`
      });

      subject = this.addon.transpileTree(input.path());
      output = createBuilder(subject);

      yield output.build();

      expect(
        output.read()
      ).to.deep.equal({
        "bar.js": `define("bar", [], function () {\n  "use strict";\n\n  var bar = function bar() {};\n});`,
        "foo.js": `define("foo", [], function () {\n  "use strict";\n\n  var foo = function foo() {};\n});`,
      });
    }));

    describe('ember modules API polyfill', function() {
      it("can opt-out via ember-cli-babel.disableEmberModulesAPIPolyfill", co.wrap(function* () {
        input.write({
          "foo.js": `import Component from '@ember/component';`
        });

        subject = this.addon.transpileTree(input.path(), {
          'ember-cli-babel': {
            disableEmberModulesAPIPolyfill: true
          }
        });

        output = createBuilder(subject);

        yield output.build();

        expect(
          output.read()
        ).to.deep.equal({
          "foo.js": `define('foo', ['@ember/component'], function (_component) {\n  'use strict';\n});`
        });
      }));

      it("should replace imports by default", co.wrap(function* () {
        input.write({
          "foo.js": `import Component from '@ember/component';`,
          "app.js": `import Application from '@ember/application';`
        });

        subject = this.addon.transpileTree(input.path());
        output = createBuilder(subject);

        yield output.build();

        expect(
          output.read()
        ).to.deep.equal({
          "foo.js": `define('foo', [], function () {\n  'use strict';\n\n  var Component = Ember.Component;\n});`,
          "app.js": `define('app', [], function () {\n  'use strict';\n\n  var Application = Ember.Application;\n});`
        });
      }));

      it("does not remove _asyncToGenerator helper function when used together with debug-macros", co.wrap(function* () {
        input.write({
          "foo.js": stripIndent`
            import { assert } from '@ember/debug';
            export default { async foo() { await this.baz; }}
          `
        });

        subject = this.addon.transpileTree(input.path());
        output = createBuilder(subject);

        yield output.build();

        let contents = output.read()['foo.js'];

        expect(contents).to.include('function _asyncToGenerator');
      }));

      it("allows @ember/debug to be consumed via both debug-macros and ember-modules-api-polyfill", co.wrap(function* () {
        input.write({
          "foo.js": stripIndent`
            import { assert, inspect } from '@ember/debug';
            export default { async foo() { await this.baz; }}
          `
        });

        subject = this.addon.transpileTree(input.path());
        output = createBuilder(subject);

        yield output.build();

        let contents = output.read()['foo.js'];

        expect(contents).to.not.include('@ember/debug');
        expect(contents).to.include('function _asyncToGenerator');
        expect(contents).to.include('var inspect = Ember.inspect;');
        expect(contents).to.not.include('assert');
      }));
    });

    describe('debug macros', function() {
      it("can opt-out via ember-cli-babel.disableDebugTooling", co.wrap(function* () {
        process.env.EMBER_ENV = 'development';

        let contents = stripIndent`
          import { DEBUG } from '@glimmer/env';
          if (DEBUG) {
            console.log('debug mode!');
          }
        `;

        input.write({
          "foo.js": contents
        });

        subject = this.addon.transpileTree(input.path(), {
          'ember-cli-babel': {
            disableDebugTooling: true
          }
        });

        output = createBuilder(subject);

        yield output.build();

        expect(
          output.read()
        ).to.deep.equal({
          "foo.js": `define('foo', ['@glimmer/env'], function (_env) {\n  'use strict';\n\n  if (_env.DEBUG) {\n    console.log('debug mode!');\n  }\n});`
        });
      }));

      describe('in development', function() {
        it("should replace env flags by default ", co.wrap(function* () {
          process.env.EMBER_ENV = 'development';

          input.write({
            "foo.js": stripIndent`
              import { DEBUG } from '@glimmer/env';
              if (DEBUG) { console.log('debug mode!'); }
            `
          });

          subject = this.addon.transpileTree(input.path());
          output = createBuilder(subject);

          yield output.build();

          expect(
            output.read()
          ).to.deep.equal({
            "foo.js": `define('foo', [], function () {\n  'use strict';\n\n  if (true) {\n    console.log('debug mode!');\n  }\n});`
          });
        }));

        it("should replace debug macros by default ", co.wrap(function* () {
          process.env.EMBER_ENV = 'development';

          input.write({
            "foo.js": stripIndent`
              import { assert } from '@ember/debug';
              assert('stuff here', isNotBad());
            `
          });

          subject = this.addon.transpileTree(input.path());
          output = createBuilder(subject);

          yield output.build();

          expect(
            output.read()
          ).to.deep.equal({
            "foo.js": `define('foo', [], function () {\n  'use strict';\n\n  (true && !(isNotBad()) && Ember.assert('stuff here', isNotBad()));\n});`
          });
        }));
      });

      describe('in production', function() {
        it("should replace env flags by default ", co.wrap(function* () {
          process.env.EMBER_ENV = 'production';

          input.write({
            "foo.js": stripIndent`
              import { DEBUG } from '@glimmer/env';
              if (DEBUG) { console.log('debug mode!'); }
            `
          });

          subject = this.addon.transpileTree(input.path());
          output = createBuilder(subject);

          yield output.build();

          expect(
            output.read()
          ).to.deep.equal({
            "foo.js": `define('foo', [], function () {\n  'use strict';\n\n  if (false) {\n    console.log('debug mode!');\n  }\n});`
          });
        }));

        it('should replace debug macros by default ', co.wrap(function* () {
          process.env.EMBER_ENV = 'production';

          input.write({
            "foo.js": stripIndent`
              import { assert } from '@ember/debug';
              assert('stuff here', isNotBad());
            `
          });

          subject = this.addon.transpileTree(input.path());
          output = createBuilder(subject);

          yield output.build();

          expect(
            output.read()
          ).to.deep.equal({
            "foo.js": `define('foo', [], function () {\n  'use strict';\n\n  (false && !(isNotBad()) && Ember.assert('stuff here', isNotBad()));\n});`
          });
        }));
      });
    });
  });

  describe('_getAddonOptions', function() {
    it('uses parent options if present', function() {
      let mockOptions = this.addon.parent.options = {};

      expect(this.addon._getAddonOptions()).to.be.equal(mockOptions);
    });

    it('uses app options if present', function() {
      let mockOptions = {};
      this.addon.app = { options: mockOptions };

      expect(this.addon._getAddonOptions()).to.be.equal(mockOptions);
    });

    it('parent options win over app options', function() {
      let mockParentOptions = this.addon.parent.options = {};
      let mockAppOptions = {};
      this.addon.app = { options: mockAppOptions };

      expect(this.addon._getAddonOptions()).to.be.equal(mockParentOptions);
    });
  });

  describe('_shouldIncludePolyfill()', function() {
    describe('without any includePolyfill option set', function() {
      it('should return false', function() {
        expect(this.addon._shouldIncludePolyfill()).to.be.false;
      });

      it('should not print deprecation messages', function() {
        this.addon._shouldIncludePolyfill();

        let deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "includePolyfill" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(0);
      });
    });

    describe('with babel.includePolyfill = true', function() {
      beforeEach(function() {
        this.addon.parent.options = { babel: { includePolyfill: true } };
      });

      it('should return true', function() {
        expect(this.addon._shouldIncludePolyfill()).to.be.true;
      });

      it('should print deprecation message exactly once', function() {
        this.addon._shouldIncludePolyfill();
        this.addon._shouldIncludePolyfill();
        this.addon._shouldIncludePolyfill();

        let deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "includePolyfill" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(1);
      });
    });

    describe('with babel.includePolyfill = false', function() {
      beforeEach(function() {
        this.addon.parent.options = { babel: { includePolyfill: false } };
      });

      it('should return false', function() {
        expect(this.addon._shouldIncludePolyfill()).to.be.false;
      });

      it('should print deprecation message exactly once', function() {
        this.addon._shouldIncludePolyfill();
        this.addon._shouldIncludePolyfill();
        this.addon._shouldIncludePolyfill();

        let deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "includePolyfill" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(1);
      });
    });

    describe('with ember-cli-babel.includePolyfill = true', function() {
      beforeEach(function() {
        this.addon.parent.options = { 'ember-cli-babel': { includePolyfill: true } };
      });

      it('should return true', function() {
        expect(this.addon._shouldIncludePolyfill()).to.be.true;
      });

      it('should not print deprecation messages', function() {
        this.addon._shouldIncludePolyfill();

        let deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "includePolyfill" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(0);
      });
    });

    describe('with ember-cli-babel.includePolyfill = false', function() {
      beforeEach(function() {
        this.addon.parent.options = { 'ember-cli-babel': { includePolyfill: false } };
      });

      it('should return false', function() {
        expect(this.addon._shouldIncludePolyfill()).to.be.false;
      });

      it('should not print deprecation messages', function() {
        this.addon._shouldIncludePolyfill();

        let deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "includePolyfill" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(0);
      });
    });

    describe('with ember-cli-babel.includePolyfill = true and babel.includePolyfill = false', function() {
      beforeEach(function() {
        this.addon.parent.options = {
          'babel': { includePolyfill: false },
          'ember-cli-babel': { includePolyfill: true },
        };
      });

      it('should prefer the "ember-cli-babel" setting', function() {
        expect(this.addon._shouldIncludePolyfill()).to.be.true;
      });

      it('should print deprecation message exactly once', function() {
        this.addon._shouldIncludePolyfill();
        this.addon._shouldIncludePolyfill();
        this.addon._shouldIncludePolyfill();

        let deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "includePolyfill" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(1);
      });
    });
  });

  describe('_shouldCompileModules()', function() {
    beforeEach(function() {
      this.addon.parent = {
        options: {}
      };
    });

    describe('without any compileModules option set', function() {
      it('returns false for ember-cli < 2.12', function() {
        this.addon.emberCLIChecker = { gt() { return false; } };

        expect(this.addon.shouldCompileModules()).to.eql(false);
      });

      it('returns true for ember-cli > 2.12.0-alpha.1', function() {
        this.addon.emberCLIChecker = { gt() { return true; } };

        expect(this.addon.shouldCompileModules()).to.be.true;
      });

      it('does not print deprecation messages', function() {
        this.addon.shouldCompileModules();

        let deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "compileModules" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(0);
      });
    });

    describe('with babel.compileModules = true', function() {
      beforeEach(function() {
        this.addon.parent.options.babel = { compileModules: true };
      });

      it('should return true', function() {
        expect(this.addon.shouldCompileModules()).to.eql(true);
      });

      it('should print deprecation message exactly once', function() {
        this.addon.shouldCompileModules();
        this.addon.shouldCompileModules();
        this.addon.shouldCompileModules();

        let deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "compileModules" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(1);
      });
    });

    describe('with babel.compileModules = false', function() {
      beforeEach(function() {
        this.addon.parent.options.babel = { compileModules: false };
      });

      it('should return false', function() {
        expect(this.addon.shouldCompileModules()).to.eql(false);
      });

      it('should print deprecation message exactly once', function() {
        this.addon.shouldCompileModules();
        this.addon.shouldCompileModules();
        this.addon.shouldCompileModules();

        let deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "compileModules" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(1);
      });
    });

    describe('with ember-cli-babel.compileModules = true', function() {
      it('should return true', function() {
        expect(this.addon._shouldCompileModules({
          'ember-cli-babel': { compileModules: true }
        })).to.eql(true);
      });

      it('should not print deprecation messages', function() {
        this.addon._shouldCompileModules({
          'ember-cli-babel': { compileModules: true }
        });

        let deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "compileModules" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(0);
      });
    });

    describe('with ember-cli-babel.compileModules = false', function() {
      beforeEach(function() {
        this.addon.parent = {
          options: {
            'ember-cli-babel': { compileModules: false }
          }
        };
      });

      it('should return false', function() {
        expect(this.addon.shouldCompileModules()).to.be.false;
      });

      it('should not print deprecation messages', function() {
        this.addon.shouldCompileModules();

        let deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "compileModules" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(0);
      });
    });
  });

  describe('_getAddonProvidedConfig', function() {
    it('does not mutate addonOptions.babel', function() {
      let babelOptions = { blah: true };
      this.addon.parent = {
        options: {
          babel: babelOptions,
        },
      };

      let result = this.addon._getAddonProvidedConfig(this.addon._getAddonOptions());
      expect(result.options).to.not.equal(babelOptions);
    });

    it('includes options specified in parent.options.babel6', function() {
      this.addon.parent = {
        options: {
          babel6: {
            loose: true
          },
        },
      };

      let result = this.addon._getAddonProvidedConfig(this.addon._getAddonOptions());
      expect(result.options.loose).to.be.true;
    });
  });

  describe('buildBabelOptions', function() {
    this.timeout(0);

    it('disables reading `.babelrc`', function() {
      let options = {};

      let result = this.addon.buildBabelOptions(options);

      expect(result.babelrc).to.be.false;
    });

    it('provides an annotation including parent name - addon', function() {
      this.addon.parent = {
        name: 'derpy-herpy'
      };
      let result = this.addon.buildBabelOptions();
      expect(result.annotation).to.include('derpy-herpy');
    });

    it('provides an annotation including parent name - project', function() {
      this.addon.parent = {
        name() { return 'derpy-herpy'; }
      };
      let result = this.addon.buildBabelOptions();
      expect(result.annotation).to.include('derpy-herpy');
    });

    it('uses provided annotation if specified', function() {
      let options = {
        'ember-cli-babel': {
          annotation: 'Hello World!'
        }
      };

      let result = this.addon.buildBabelOptions(options);
      expect(result.annotation).to.equal('Hello World!');
    });

    it('uses provided sourceMaps if specified', function() {
      let options = {
        babel: {
          sourceMaps: 'inline'
        }
      };

      let result = this.addon.buildBabelOptions(options);
      expect(result.sourceMaps).to.equal('inline');
    });

    it('does not include all provided options', function() {
      let babelOptions = { blah: true };
      let options = {
        babel: babelOptions
      };

      let result = this.addon.buildBabelOptions(options);
      expect(result.blah).to.be.undefined;
    });

    it('does not include all provided options', function() {
      let babelOptions = { blah: true };
      this.addon.parent = {
        options: {
          babel: babelOptions,
        },
      };

      let result = this.addon.buildBabelOptions();
      expect(result.blah).to.be.undefined;
    });

    it('includes user plugins in parent.options.babel.plugins', function() {
      let plugin = {};
      this.addon.parent = {
        options: {
          babel: {
            plugins: [ plugin ]
          },
        },
      };

      let result = this.addon.buildBabelOptions();
      expect(result.plugins).to.include(plugin);
    });

    it('includes postTransformPlugins after preset-env plugins', function() {
      let plugin = {};
      let pluginAfter = {};
      this.addon.parent = {
        options: {
          babel: {
            plugins: [ plugin ],
            postTransformPlugins: [ pluginAfter ]
          },
        },
      };

      let result = this.addon.buildBabelOptions();

      expect(result.plugins).to.include(plugin);
      expect(result.plugins.slice(-1)).to.deep.equal([pluginAfter]);
      expect(result.postTransformPlugins).to.be.undefined;
    });

    it('includes user plugins in parent.options.babel6.plugins', function() {
      let plugin = {};
      this.addon.parent = {
        options: {
          babel6: {
            plugins: [ plugin ]
          },
        },
      };

      let result = this.addon.buildBabelOptions();
      expect(result.plugins).to.include(plugin);
    });

    it('user plugins are before preset-env plugins', function() {
      let plugin = function Plugin() {};
      this.addon.parent = {
        options: {
          babel: {
            plugins: [ plugin ]
          },
        },
      };

      let result = this.addon.buildBabelOptions();
      expect(result.plugins[0]).to.equal(plugin);
    });

    it('includes resolveModuleSource if compiling modules', function() {
      this.addon._shouldCompileModules = () => true;

      let result = this.addon.buildBabelOptions();
      expect(result.resolveModuleSource).to.equal(require('amd-name-resolver').moduleResolve);
    });

    it('does not include resolveModuleSource when not compiling modules', function() {
      this.addon._shouldCompileModules = () => false;

      let result = this.addon.buildBabelOptions();
      expect(result.resolveModuleSource).to.equal(undefined);
    });
  });

  describe('_getPresetEnvPlugins', function() {
    function includesPlugin(haystack, needleName) {
      let presetEnvBaseDir = path.dirname(require.resolve('babel-preset-env'));
      let pluginPath = resolve.sync(needleName, { basedir: presetEnvBaseDir });
      let PluginModule = require(pluginPath);
      let Needle = PluginModule.__esModule ? PluginModule.default : PluginModule;

      for (let i = 0; i < haystack.length; i++) {
        let Plugin = haystack[i][0];

        if (Plugin === Needle) {
          return true;
        }
      }

      return false;
    }

    it('passes options.babel through to preset-env', function() {
      let babelOptions = { loose: true };
      this.addon.parent = {
        options: {
          babel: babelOptions,
        },
      };

      let invokingOptions;
      this.addon._presetEnv = function(context, options) {
        invokingOptions = options;
        return { plugins: [] };
      };

      this.addon.buildBabelOptions();

      expect(invokingOptions.loose).to.be.true;
    });

    it('passes options.babel6 through to preset-env', function() {
      let babelOptions = { loose: true };
      this.addon.parent = {
        options: {
          babel6: babelOptions,
        },
      };

      let invokingOptions;
      this.addon._presetEnv = function(context, options) {
        invokingOptions = options;
        return { plugins: [] };
      };

      this.addon.buildBabelOptions();

      expect(invokingOptions.loose).to.be.true;
    });

    it('includes class transform when targets require plugin', function() {
      this.addon.project.targets = {
        browsers: ['ie 9']
      };

      let plugins = this.addon.buildBabelOptions().plugins;
      let found = includesPlugin(plugins, 'babel-plugin-transform-es2015-classes');

      expect(found).to.be.true;
    });

    it('returns false when targets do not require plugin', function() {
      this.addon.project.targets = {
        browsers: ['last 2 chrome versions']
      };

      let plugins = this.addon.buildBabelOptions().plugins;
      let found = includesPlugin(plugins, 'babel-plugin-transform-es2015-classes');

      expect(found).to.be.false;
    });
  });

  describe('isPluginRequired', function() {
    it('returns true when no targets are specified', function() {
      this.addon.project.targets = null;

      let pluginRequired = this.addon.isPluginRequired('transform-regenerator');
      expect(pluginRequired).to.be.true;
    });

    it('returns true when targets require plugin', function() {
      this.addon.project.targets = {
        browsers: ['ie 9']
      };

      let pluginRequired = this.addon.isPluginRequired('transform-regenerator');
      expect(pluginRequired).to.be.true;
    });

    it('returns false when targets do not require plugin', function() {
      this.addon.project.targets = {
        browsers: ['last 2 chrome versions']
      };

      let pluginRequired = this.addon.isPluginRequired('transform-regenerator');
      expect(pluginRequired).to.be.false;
    });
  });

  describe('_requiredPolyfills', function() {
    const builtInsList = require('babel-preset-env/data/built-ins');
    const defaultWebIncludes = require('babel-preset-env/lib/default-includes').defaultWebIncludes;

    let allKnownPolyfills = [].concat(
      Object.keys(builtInsList),
      defaultWebIncludes
    );

    beforeEach(function() {
      this.addon.parent.options = { 'ember-cli-babel': { includePolyfill: true } };
    });

    it('returns the list of all polyfills for an old platform', function() {
      this.addon.project.targets = {
        browsers: ['ie 9']
      };

      let polyfills = this.addon._requiredPolyfills();

      // ie 9 requires all the polyfills :P
      expect(polyfills).to.deep.equal(allKnownPolyfills);
    });

    it('returns a subset of the polyfills for a recent platform', function() {
      this.addon.project.targets = {
        browsers: ['last 1 chrome versions']
      };

      let polyfills = this.addon._requiredPolyfills();

      // chrome only gets the `defaultWebIncludes`
      expect(polyfills.length).to.be.lt(allKnownPolyfills.length);
    });
  });

  describe('treeForVendor', function() {
    let output, subject;

    this.timeout(100000);

    afterEach(co.wrap(function* () {
      yield output.dispose();
    }));

    it("should include polyfills for target platform", co.wrap(function* () {
      this.addon.parent.options = { 'ember-cli-babel': { includePolyfill: true } };

      subject = this.addon.treeForVendor();
      output = createBuilder(subject);

      yield output.build();

      let files = walkSync(output.path(), { directories: false });
      expect(files).to.deep.equal(['ember-cli-babel/polyfill.js']);
    }));

    it("should return undefined when `includePolyfill` is false", function() {
      this.addon.parent.options = { 'ember-cli-babel': { includePolyfill: false } };

      subject = this.addon.treeForVendor();

      expect(subject).to.be.undefined;
    });
  });
});
