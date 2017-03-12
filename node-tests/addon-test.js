var expect = require('chai').expect;
var MockUI = require('console-ui/mock');
var CoreObject = require('core-object');
var AddonMixin = require('../index');

var Addon = CoreObject.extend(AddonMixin);

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

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
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

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
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

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
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

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
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

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
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

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
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
      it('should return false', function() {
        expect(this.addon._shouldCompileModules()).to.be.false;
      });

      it('should not print deprecation messages', function() {
        this.addon._shouldCompileModules();

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
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

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
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

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
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

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
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

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
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
});
