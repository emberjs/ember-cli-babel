var expect = require('chai').expect;
var MockUI = require('console-ui/mock');
var CoreObject = require('core-object');
var AddonMixin = require('../index');

var Addon = CoreObject.extend(AddonMixin);

describe('ember-cli-babel', function() {
  beforeEach(function() {
    this.ui = new MockUI();
    this.addon = new Addon({
      project: {
        root: __dirname,
      },
      parent: {},
      ui: this.ui,
    });
  });

  describe('shouldIncludePolyfill()', function() {
    describe('without any includePolyfill option set', function() {
      it('should return false', function() {
        expect(this.addon.shouldIncludePolyfill()).to.be.false;
      });

      it('should not print deprecation messages', function() {
        this.addon.shouldIncludePolyfill();

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
        expect(this.addon.shouldIncludePolyfill()).to.be.true;
      });

      it('should print deprecation message exactly once', function() {
        this.addon.shouldIncludePolyfill();
        this.addon.shouldIncludePolyfill();
        this.addon.shouldIncludePolyfill();

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
        expect(this.addon.shouldIncludePolyfill()).to.be.false;
      });

      it('should print deprecation message exactly once', function() {
        this.addon.shouldIncludePolyfill();
        this.addon.shouldIncludePolyfill();
        this.addon.shouldIncludePolyfill();

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
        expect(this.addon.shouldIncludePolyfill()).to.be.true;
      });

      it('should not print deprecation messages', function() {
        this.addon.shouldIncludePolyfill();

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
        expect(this.addon.shouldIncludePolyfill()).to.be.false;
      });

      it('should not print deprecation messages', function() {
        this.addon.shouldIncludePolyfill();

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "includePolyfill" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(0);
      });
    });
  });

  describe('_shouldCompileModules()', function() {
    describe('without any compileModules option set', function() {
      beforeEach(function() {
        this.addonOptions = {};
      });

      it('should return false', function() {
        expect(this.addon._shouldCompileModules(this.addonOptions)).to.be.false;
      });

      it('should not print deprecation messages', function() {
        this.addon._shouldCompileModules(this.addonOptions);

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "compileModules" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(0);
      });
    });

    describe('with babel.compileModules = true', function() {
      beforeEach(function() {
        this.addonOptions = { babel: { compileModules: true } };
      });

      it('should return true', function() {
        expect(this.addon._shouldCompileModules(this.addonOptions)).to.be.true;
      });

      it('should print deprecation message exactly once', function() {
        this.addon._shouldCompileModules(this.addonOptions);
        this.addon._shouldCompileModules(this.addonOptions);
        this.addon._shouldCompileModules(this.addonOptions);

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "compileModules" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(1);
      });
    });

    describe('with babel.compileModules = false', function() {
      beforeEach(function() {
        this.addonOptions = { babel: { compileModules: false } };
      });

      it('should return false', function() {
        expect(this.addon._shouldCompileModules(this.addonOptions)).to.be.false;
      });

      it('should print deprecation message exactly once', function() {
        this.addon._shouldCompileModules(this.addonOptions);
        this.addon._shouldCompileModules(this.addonOptions);
        this.addon._shouldCompileModules(this.addonOptions);

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "compileModules" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(1);
      });
    });

    describe('with ember-cli-babel.compileModules = true', function() {
      beforeEach(function() {
        this.addonOptions = { 'ember-cli-babel': { compileModules: true } };
      });

      it('should return true', function() {
        expect(this.addon._shouldCompileModules(this.addonOptions)).to.be.true;
      });

      it('should not print deprecation messages', function() {
        this.addon._shouldCompileModules(this.addonOptions);

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "compileModules" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(0);
      });
    });

    describe('with ember-cli-babel.compileModules = false', function() {
      beforeEach(function() {
        this.addonOptions = { 'ember-cli-babel': { compileModules: false } };
      });

      it('should return false', function() {
        expect(this.addon._shouldCompileModules(this.addonOptions)).to.be.false;
      });

      it('should not print deprecation messages', function() {
        this.addon._shouldCompileModules(this.addonOptions);

        var deprecationMessages = this.ui.output.split('\n').filter(function(line) {
          return line.indexOf('Putting the "compileModules" option in "babel" is deprecated') !== -1;
        });

        expect(deprecationMessages).to.have.lengthOf(0);
      });
    });
  });
});
