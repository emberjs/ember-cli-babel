/* eslint-env mocha, node */
'use strict';

const co = require('co');
const expect = require('chai').expect;
const MockUI = require('console-ui/mock');
const CoreObject = require('core-object');
const AddonMixin = require('../index');
const CommonTags = require('common-tags');
const stripIndent = CommonTags.stripIndent;
const BroccoliTestHelper = require('broccoli-test-helper');
const createBuilder = BroccoliTestHelper.createBuilder;
const createTempDir = BroccoliTestHelper.createTempDir;
const terminateWorkerPool = require('./utils/terminate-workers');

let Addon = CoreObject.extend(AddonMixin);

describe('ember-cli-babel', function() {

  const ORIGINAL_EMBER_ENV = process.env.EMBER_ENV;

  beforeEach(function() {
    this.ui = new MockUI();
    let project = {
      root: __dirname,
      emberCLIVersion: () => '2.16.2',
      dependencies() { return {}; },
      addons: []
    };

    this.addon = new Addon({
      project,
      parent: project,
      ui: this.ui,
    });

    project.addons.push(this.addon);
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
      // shut down workers after the tests are run so that mocha doesn't hang
      yield terminateWorkerPool();
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
          "foo.js": `define("foo", ["@ember/component"], function (_component) {\n  "use strict";\n});`
        });
      }));

      it("should replace imports by default", co.wrap(function* () {
        input.write({
          "foo.js": `import Component from '@ember/component'; Component.extend()`,
          "app.js": `import Application from '@ember/application'; Application.extend()`
        });

        subject = this.addon.transpileTree(input.path());
        output = createBuilder(subject);

        yield output.build();

        expect(
          output.read()
        ).to.deep.equal({
          "foo.js": `define("foo", [], function () {\n  "use strict";\n\n  Ember.Component.extend();\n});`,
          "app.js": `define("app", [], function () {\n  "use strict";\n\n  Ember.Application.extend();\n});`
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
            export default { async foo() { inspect(await this.baz); }}
          `
        });

        subject = this.addon.transpileTree(input.path());
        output = createBuilder(subject);

        yield output.build();

        let contents = output.read()['foo.js'];

        expect(contents).to.not.include('@ember/debug');
        expect(contents).to.include('function _asyncToGenerator');
        expect(contents).to.include('Ember.inspect;');
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
          "foo.js": `define("foo", ["@glimmer/env"], function (_env) {\n  "use strict";\n\n  if (_env.DEBUG) {\n    console.log('debug mode!');\n  }\n});`
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
            "foo.js": `define("foo", [], function () {\n  "use strict";\n\n  if (true\n  /* DEBUG */\n  ) {\n    console.log('debug mode!');\n  }\n});`
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
            "foo.js": `define("foo", [], function () {\n  "use strict";\n\n  (true && !(isNotBad()) && Ember.assert('stuff here', isNotBad()));\n});`
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
            "foo.js": `define("foo", [], function () {\n  "use strict";\n\n  if (false\n  /* DEBUG */\n  ) {\n    console.log('debug mode!');\n  }\n});`
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
            "foo.js": `define("foo", [], function () {\n  "use strict";\n\n  (false && !(isNotBad()) && Ember.assert('stuff here', isNotBad()));\n});`
          });
        }));
      });
    });

    describe('@ember/string detection', function() {
      function buildEmberStringFixture() {
        return {
          node_modules: {
            '@ember': {
              'string': {
                'package.json': JSON.stringify({ name: '@ember/string', version: '1.0.0' }),
                'index.js': 'module.exports = {};',
              },
            },
          }
        };
      }

      let dependencies;
      beforeEach(function() {
        dependencies = {};
        let project = {
          root: input.path(),
          emberCLIVersion: () => '2.16.2',
          dependencies() { return dependencies; },
          addons: []
        };

        this.addon = new Addon({
          project,
          parent: project,
          ui: this.ui,
        });

        project.addons.push(this.addon);
      });

      it('does not transpile the @ember/string imports when addon is present in parent', co.wrap(function* () {
        input.write(buildEmberStringFixture())
        input.write({
          app: {
            "foo.js": stripIndent`
              import { camelize } from '@ember/string';
              camelize('stuff-here');
            `,
          },
        });

        dependencies['@ember/string'] = '1.0.0';

        subject = this.addon.transpileTree(input.path('app'));
        output = createBuilder(subject);

        yield output.build();

        expect(
          output.read()
        ).to.deep.equal({
          "foo.js": `define("foo", ["@ember/string"], function (_string) {\n  "use strict";\n\n  (0, _string.camelize)('stuff-here');\n});`
        });
      }));

      it('transpiles the @ember/string imports when addon is missing', co.wrap(function* () {
        input.write({
          node_modules: {
          },
          app: {
            "foo.js": stripIndent`
              import { camelize } from '@ember/string';
              camelize('stuff-here');
            `,
          },
        });

        subject = this.addon.transpileTree(input.path('app'));
        output = createBuilder(subject);

        yield output.build();

        expect(
          output.read()
        ).to.deep.equal({
          "foo.js": `define("foo", [], function () {\n  "use strict";\n\n  Ember.String.camelize('stuff-here');\n});`
        });
      }));

      it('transpiles the @ember/string imports when addon is not a dependency of the parent', co.wrap(function* () {
        let project = {
          root: input.path(),
          emberCLIVersion: () => '2.16.2',
          dependencies() { return dependencies; },
          addons: [
          ]
        };
        let projectsBabel = new Addon({
          project,
          parent: project,
          ui: this.ui,
        });
        project.addons.push(projectsBabel);

        let parentAddon = {
          root: input.path('node_modules/awesome-thang'),
          dependencies() { return dependencies; },
          project,
          addons: []
        };
        project.addons.push(parentAddon);

        this.addon = new Addon({
          project,
          parent: project,
          ui: this.ui,
        });
        parentAddon.addons.push(this.addon);

        input.write({
          node_modules: {
            'awesome-thang': {
              addon: {
                "foo.js": stripIndent`
                  import { camelize } from '@ember/string';
                  camelize('stuff-here');
                `,
              },
              'package.json': JSON.stringify({ name: 'awesome-thang', private: true }),
              'index.js': '',
            }
          }
        });

        input.write(buildEmberStringFixture());

        subject = this.addon.transpileTree(input.path('node_modules/awesome-thang/addon'));
        output = createBuilder(subject);

        yield output.build();

        expect(
          output.read()
        ).to.deep.equal({
          "foo.js": `define(\"foo\", [], function () {\n  \"use strict\";\n\n  Ember.String.camelize('stuff-here');\n});`
        });
      }));
    });

    describe('@ember/jquery detection', function() {
      function buildEmberJQueryFixture() {
        return {
          node_modules: {
            '@ember': {
              'jquery': {
                'package.json': JSON.stringify({ name: '@ember/jquery', version: '0.6.0' }),
                'index.js': 'module.exports = {};',
              },
            },
          }
        };
      }

      let dependencies;
      beforeEach(function() {
        dependencies = {};
        let project = {
          root: input.path(),
          emberCLIVersion: () => '2.16.2',
          dependencies() { return dependencies; },
          addons: []
        };

        this.addon = new Addon({
          project,
          parent: project,
          ui: this.ui,
        });

        project.addons.push(this.addon);
      });

      it('does not transpile the jquery imports when addon is present in parent', co.wrap(function* () {
        input.write(buildEmberJQueryFixture());
        input.write({
          app: {
            "foo.js": stripIndent`
              import $ from 'jquery';
              $('.foo').click();
            `,
          },
        });

        dependencies['@ember/jquery'] = '0.6.0';

        subject = this.addon.transpileTree(input.path('app'));
        output = createBuilder(subject);

        yield output.build();

        expect(
          output.read()
        ).to.deep.equal({
          "foo.js": `define("foo", ["jquery"], function (_jquery) {\n  "use strict";\n\n  (0, _jquery.default)('.foo').click();\n});`
        });
      }));

      it('transpiles the jquery imports when addon is missing', co.wrap(function* () {
        input.write({
          node_modules: {
          },
          app: {
            "foo.js": stripIndent`
              import $ from 'jquery';
              $('.foo').click();
            `,
          },
        });

        subject = this.addon.transpileTree(input.path('app'));
        output = createBuilder(subject);

        yield output.build();

        expect(
          output.read()
        ).to.deep.equal({
          "foo.js": `define("foo", [], function () {\n  "use strict";\n\n  Ember.$('.foo').click();\n});`
        });
      }));

      it('transpiles the jquery imports when addon is not a dependency of the parent', co.wrap(function* () {
        let project = {
          root: input.path(),
          emberCLIVersion: () => '2.16.2',
          dependencies() { return dependencies; },
          addons: [
          ]
        };
        let projectsBabel = new Addon({
          project,
          parent: project,
          ui: this.ui,
        });
        project.addons.push(projectsBabel);

        let parentAddon = {
          root: input.path('node_modules/awesome-thang'),
          dependencies() { return dependencies; },
          project,
          addons: []
        };
        project.addons.push(parentAddon);

        this.addon = new Addon({
          project,
          parent: project,
          ui: this.ui,
        });
        parentAddon.addons.push(this.addon);

        input.write({
          node_modules: {
            'awesome-thang': {
              addon: {
                "foo.js": stripIndent`
                  import $ from 'jquery';
                  $('.foo').click();
                `,
              },
              'package.json': JSON.stringify({ name: 'awesome-thang', private: true }),
              'index.js': '',
            }
          }
        });

        input.write(buildEmberJQueryFixture());

        subject = this.addon.transpileTree(input.path('node_modules/awesome-thang/addon'));
        output = createBuilder(subject);

        yield output.build();

        expect(
          output.read()
        ).to.deep.equal({
          "foo.js": `define("foo", [], function () {\n  "use strict";\n\n  Ember.$('.foo').click();\n});`
        });
      }));
    });


    describe('_shouldDoNothing', function() {
      it("will no-op if nothing to do", co.wrap(function* () {
        input.write({
          "foo.js": `invalid code`
        });

        subject = this.addon.transpileTree(input.path(), {
          'ember-cli-babel': {
            compileModules: false,
            disablePresetEnv: true,
            disableDebugTooling: true,
            disableEmberModulesAPIPolyfill: true
          }
        });

        output = createBuilder(subject);

        yield output.build();

        expect(
          output.read()
        ).to.deep.equal({
          "foo.js": `invalid code`
        });
      }));
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
  });

  describe('_getDecoratorPlugins', function() {
    it('should include babel transforms by default', function() {
      expect(this.addon._getDecoratorPlugins({}).length).to.equal(2, 'plugins added correctly');
    });

    it('should not include babel transforms if it detects decorators plugin', function() {
      this.addon.project.ui = {
        writeWarnLine(message) {
          expect(message).to.match(/has added the decorators and\/or class properties plugins to its build/);
        }
      };

      expect(this.addon._getDecoratorPlugins({
        babel: {
          plugins: [
            ['@babel/plugin-proposal-decorators']
          ]
        }
      }).length).to.equal(0, 'plugins were not added');
    });

    it('should not include babel transforms if it detects class fields plugin', function() {
      this.addon.project.ui = {
        writeWarnLine(message) {
          expect(message).to.match(/has added the decorators and\/or class properties plugins to its build/);
        }
      };

      expect(this.addon._getDecoratorPlugins({
        babel: {
          plugins: [
            ['@babel/plugin-proposal-class-properties']
          ]
        }
      }).length).to.equal(0, 'plugins were not added');
    });
  });

  describe('_shouldIncludeHelpers()', function() {
    beforeEach(function() {
      this.addon.app = {
        options: {}
      };
    });

    it('should return false without any includeExternalHelpers option set', function() {
      expect(this.addon._shouldIncludeHelpers({})).to.be.false;
    });

    it('should throw an error with ember-cli-babel.includeExternalHelpers = true in parent', function() {
      this.addon.parent.options = { 'ember-cli-babel': { includeExternalHelpers: true } };

      expect(() => this.addon._shouldIncludeHelpers({})).to.throw;
    });

    it('should return true with ember-cli-babel.includeExternalHelpers = true in app and ember-cli-version is high enough', function() {
      this.addon.pkg = { version: '7.3.0-beta.1' };

      this.addon.app.options = { 'ember-cli-babel': { includeExternalHelpers: true } };

      expect(this.addon._shouldIncludeHelpers({})).to.be.true;
    });

    it('should return false when compileModules is false', function() {
      this.addon.pkg = { version: '7.3.0-beta.1' };

      this.addon.app.options = { 'ember-cli-babel': { includeExternalHelpers: true } };

      // precond
      expect(this.addon._shouldIncludeHelpers({})).to.be.true;

      expect(this.addon._shouldIncludeHelpers({ 'ember-cli-babel': { compileModules: false } })).to.be.false;
    });

    it('should return false with ember-cli-babel.includeExternalHelpers = true in app and write warn line if ember-cli-version is not high enough', function() {
      this.addon.project.name = 'dummy';
      this.addon.project.ui = {
        writeWarnLine(message) {
          expect(message).to.match(/dummy attempted to include external babel helpers/);
        }
      };

      this.addon.app.options = { 'ember-cli-babel': { includeExternalHelpers: true } };

      expect(this.addon._shouldIncludeHelpers({})).to.be.false;
    });

    it('should return false with ember-cli-babel.includeExternalHelpers = false in host', function() {
      this.addon.app.options = { 'ember-cli-babel': { includeExternalHelpers: false } };

      expect(this.addon._shouldIncludeHelpers({})).to.be.false;
    });

    describe('autodetection', function() {
      it('should return true if @ember-decorators/babel-transforms exists and ember-cli-babel version is high enough', function() {
        this.addon.pkg = { version: '7.3.0-beta.1' };
        this.addon.project.addons.push({
          pkg: {
            name: '@ember-decorators/babel-transforms'
          }
        });

        expect(this.addon._shouldIncludeHelpers({})).to.be.true;
      });

      it('should return false if @ember-decorators/babel-transforms exists and write warn line if ember-cli-version is not high enough', function() {
        this.addon.project.name = 'dummy';
        this.addon.project.ui = {
          writeWarnLine(message) {
            expect(message).to.match(/dummy attempted to include external babel helpers/);
          }
        };

        this.addon.project.addons.push({
          pkg: {
            name: '@ember-decorators/babel-transforms'
          }
        });

        expect(this.addon._shouldIncludeHelpers({})).to.be.false;
      });
    })
  });

  describe('_shouldCompileModules()', function() {
    beforeEach(function() {
      this.addon.parent = {
        dependencies() { return {}; },
        options: {}
      };
    });

    describe('without any compileModules option set', function() {
      it('returns false for ember-cli < 2.12', function() {
        this.addon.project.emberCLIVersion = () => '2.11.1';

        expect(this.addon.shouldCompileModules()).to.eql(false);
      });

      it('returns true for ember-cli > 2.12.0-alpha.1', function() {
        this.addon.project.emberCLIVersion = () => '2.13.0';

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
          dependencies() { return {}; },
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
        dependencies() { return {}; },
        options: {
          babel: babelOptions,
        },
      };

      let result = this.addon._getAddonProvidedConfig(this.addon._getAddonOptions());
      expect(result.options).to.not.equal(babelOptions);
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
        name: 'derpy-herpy',
        dependencies() { return {}; },
      };
      let result = this.addon.buildBabelOptions();
      expect(result.annotation).to.include('derpy-herpy');
    });

    it('provides an annotation including parent name - project', function() {
      this.addon.parent = {
        name() { return 'derpy-herpy'; },
        dependencies() { return {}; },
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

    it('disables reading `.babelrc`', function() {
      let options = {};

      let result = this.addon.buildBabelOptions(options);

      expect(result.babelrc).to.be.false;
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
        dependencies() { return {}; },
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
        dependencies() { return {}; },
        options: {
          babel: {
            plugins: [ plugin ]
          },
        },
      };

      let result = this.addon.buildBabelOptions();
      expect(result.plugins).to.deep.include(plugin);
    });

    it('includes postTransformPlugins after preset-env plugins', function() {
      let plugin = {};
      let pluginAfter = {};
      this.addon.parent = {
        dependencies() { return {}; },
        options: {
          babel: {
            plugins: [ plugin ],
            postTransformPlugins: [ pluginAfter ]
          },
        },
      };

      let result = this.addon.buildBabelOptions();

      expect(result.plugins).to.deep.include(plugin);
      expect(result.plugins.slice(-1)).to.deep.equal([pluginAfter]);
      expect(result.postTransformPlugins).to.be.undefined;
    });

    it('sets `presets` to empty array if `disablePresetEnv` is true', function() {
      let options = {
        'ember-cli-babel': {
          disablePresetEnv: true,
        }
      };
      this.addon.parent = {
        dependencies() { return {}; },
        options: {
          babel6: {
            plugins: [ {} ]
          },
        },
      };

      let result = this.addon.buildBabelOptions(options);
      expect(result.presets).to.deep.equal([]);
    });

    it('user plugins are before preset-env plugins', function() {
      let plugin = function Plugin() {};
      this.addon.parent = {
        dependencies() { return {}; },
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

      let expectedPlugin = require.resolve('babel-plugin-module-resolver');

      let result = this.addon.buildBabelOptions();
      let found = result.plugins.find(plugin => plugin[0] === expectedPlugin);

      expect(typeof found[1].resolvePath).to.equal('function');
    });

    it('does not include resolveModuleSource when not compiling modules', function() {
      this.addon._shouldCompileModules = () => false;

      let expectedPlugin = require('babel-plugin-module-resolver').default;

      let result = this.addon.buildBabelOptions();
      let found = result.plugins.find(plugin => plugin[0] === expectedPlugin);

      expect(found).to.equal(undefined);
    });
  });

  describe('_getPresetEnv', function() {
    this.timeout(5000);

    it('does nothing when disablePresetEnv is set', function() {
      let _presetEnvCalled = false;

      this.addon._presetEnv = function() {
        _presetEnvCalled = true;
      };

      this.addon.buildBabelOptions({
        'ember-cli-babel': {
          disablePresetEnv: true,
        }
      });

      expect(_presetEnvCalled).to.be.false;
    });

    it('passes options.babel through to preset-env', function() {
      let babelOptions = { loose: true };
      this.addon.parent = {
        dependencies() { return {}; },
        options: {
          babel: babelOptions,
        },
      };

      let options = this.addon.buildBabelOptions();

      expect(options.presets).to.deep.equal([
        [require.resolve('@babel/preset-env'), {
          loose: true,
          modules: false,
          targets: undefined,
        }],
      ]);
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
