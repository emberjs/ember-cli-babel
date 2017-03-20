'use strict';

const expect = require('chai').expect;
const MockUI = require('console-ui/mock');
const CoreObject = require('core-object');
const AddonMixin = require('../index');

let Addon = CoreObject.extend(AddonMixin);

describe('ember-cli-babel', function() {
  beforeEach(function() {
    this.ui = new MockUI();
    let project = { root: __dirname };
    this.addon = new Addon({
      project,
      parent: project,
      ui: this.ui,
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
      it('should return false for ember-cli < 2.12', function() {
        this.addon.emberCLIChecker = { gt() { return false; } };

        expect(this.addon._shouldCompileModules()).to.be.false;
      });

      it('should return true for ember-cli > 2.12.0-alpha.1', function() {
        this.addon.emberCLIChecker = { gt() { return true; } };

        expect(this.addon._shouldCompileModules()).to.be.true;
      });

      it('should not print deprecation messages', function() {
        this.addon._shouldCompileModules();

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
        expect(this.addon._shouldCompileModules()).to.be.true;
      });

      it('should print deprecation message exactly once', function() {
        this.addon._shouldCompileModules();
        this.addon._shouldCompileModules();
        this.addon._shouldCompileModules();

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
        expect(this.addon._shouldCompileModules()).to.be.false;
      });

      it('should print deprecation message exactly once', function() {
        this.addon._shouldCompileModules();
        this.addon._shouldCompileModules();
        this.addon._shouldCompileModules();

        let deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "compileModules" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(1);
      });
    });

    describe('with ember-cli-babel.compileModules = true', function() {
      beforeEach(function() {
        this.addon.parent = {
          options: {
            'ember-cli-babel': { compileModules: true }
          }
        };
      });

      it('should return true', function() {
        expect(this.addon._shouldCompileModules()).to.be.true;
      });

      it('should not print deprecation messages', function() {
        this.addon._shouldCompileModules();

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
        expect(this.addon._shouldCompileModules()).to.be.false;
      });

      it('should not print deprecation messages', function() {
        this.addon._shouldCompileModules();

        let deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "compileModules" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(0);
      });
    });

    describe('with ember-cli-babel.compileModules = true and babel.compileModules = false', function() {
      beforeEach(function() {
        this.addon.parent = {
          options: {
            'babel': { compileModules: false },
            'ember-cli-babel': { compileModules: true },
          },
        };
      });

      it('should prefer the "ember-cli-babel" setting', function() {
        expect(this.addon._shouldCompileModules(this.addonOptions)).to.be.true;
      });
    });
  });

  describe('_getBabelOptions', function() {
    this.timeout(20000);

    it('does not mutate addonOptions.babel', function() {
      let babelOptions = { blah: true };
      this.addon.parent = {
        options: {
          babel: babelOptions,
        },
      };

      let result = this.addon._getBabelOptions();
      expect(result).to.not.equal(babelOptions);
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

      let result = this.addon._getBabelOptions();
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

      let result = this.addon._getBabelOptions();

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

      let result = this.addon._getBabelOptions();
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

      let result = this.addon._getBabelOptions();
      expect(result.plugins[0]).to.equal(plugin);
    });

    it('includes resolveModuleSource if compiling modules', function() {
      this.addon._shouldCompileModules = () => true;

      let result = this.addon._getBabelOptions();
      expect(result.resolveModuleSource).to.equal(require('amd-name-resolver').moduleResolve);
    });

    it('does not include resolveModuleSource when not compiling modules', function() {
      this.addon._shouldCompileModules = () => false;

      let result = this.addon._getBabelOptions();
      expect(result.resolveModuleSource).to.equal(undefined);
    });
  });

  describe('_getPresetEnvPlugins', function() {
    it('passes options through to preset-env', function() {
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

      this.addon._getPresetEnvPlugins();

      expect(invokingOptions.loose).to.be.true;
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
});
