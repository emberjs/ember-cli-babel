/* eslint-env mocha, node */
'use strict';

const co = require('co');
const expect = require('chai').expect;
const MockUI = require('console-ui/mock');
const CoreObject = require('core-object');
const AddonMixin = require('../index');
const CommonTags = require('common-tags');
const stripIndent = CommonTags.stripIndent;
const { ensureSymlinkSync } = require('fs-extra');
const FixturifyProject = require('fixturify-project');
const EmberProject = require('ember-cli/lib/models/project');
const MockCLI = require('ember-cli/tests/helpers/mock-cli');
const BroccoliTestHelper = require('broccoli-test-helper');
const createBuilder = BroccoliTestHelper.createBuilder;
const createTempDir = BroccoliTestHelper.createTempDir;
const terminateWorkerPool = require('./utils/terminate-workers');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const clone = require('clone');
const {
  _shouldHandleTypeScript,
  _shouldIncludeHelpers,
  _shouldCompileModules,
  _getExtensions
} = require("../lib/babel-options-util");

function prepareAddon(addon) {
  addon.pkg.keywords.push('ember-addon');
  addon.pkg['ember-addon'] = {};
  addon.files['index.js'] = 'module.exports = { name: require("./package").name };';

  return addon;
}

let Addon = CoreObject.extend(AddonMixin);

describe('ember-cli-babel', function() {

  const ORIGINAL_EMBER_ENV = process.env.EMBER_ENV;

  const POST_EMBER_MODULE_IMPORTS_VERSION = "3.27.0";
  const PRE_EMBER_MODULE_IMPORTS_VERSION = "3.26.0";


  function buildEmberSourceFixture(version) {
    return {
      node_modules: {
        "ember-source": {
          "package.json": JSON.stringify({ name: "ember-source", version }),
          "index.js": "module.exports = {};",
        },
      },
    };
  }

  let input;
  let dependencies;

  beforeEach(co.wrap(function* () {
    input = yield createTempDir();
    dependencies = {};
    this.ui = new MockUI();
    let project = {
      isEmberCLIProject: () => true,
      _addonsInitialized: true,
      root: input.path(),
      emberCLIVersion: () => '2.16.2',
      dependencies() { return dependencies; },
      addons: [],
      targets: {
        browsers: ['ie 11'],
      },
    };

    this.addon = new Addon({
      project,
      parent: project,
      ui: this.ui,
    });

    project.addons.push(this.addon);
  }));

  afterEach(co.wrap(function*() {
    if (ORIGINAL_EMBER_ENV === undefined) {
      delete process.env.EMBER_ENV;
    } else {
      process.env.EMBER_ENV = ORIGINAL_EMBER_ENV;
    }

    if (input) {
      yield input.dispose();
    }
  }));

  describe('transpileTree', function() {
    this.timeout(0);

    let output;
    let subject;

    afterEach(co.wrap(function* () {
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

    describe('decorators and class fields', function() {
      it(
        "can compile decorators",
        co.wrap(function* () {
          input.write({
            "foo.js": `import Component from '@glimmer/component';\nimport { tracked } from '@glimmer/tracking';\nexport default class Foo extends Component { @tracked thisIsTracked = true; }`,
          });

          this.addon.project.targets = {
            browsers: ["last 2 chrome versions"],
          };

          subject = this.addon.transpileTree(input.path(), {});

          output = createBuilder(subject);

          yield output.build();
          expect(output.read()["foo.js"]).not.to.include(
            "_initializerWarningHelper(_descriptor, this)"
          );
        })
      );

      it(
        "can compile class fields",
        co.wrap(function* () {
          input.write({
            "foo.js": `import Component from '@ember/component';\n\nexport default class Foo extends Component { thisIsAField = true; }`,
          });

          this.addon.project.targets = {
            browsers: ["last 2 chrome versions"],
          };

          subject = this.addon.transpileTree(input.path(), {});

          output = createBuilder(subject);

          yield output.build();
          expect(output.read()["foo.js"]).not.to.include(
            "Decorating class property failed"
          );
        })
      );
    });

    describe('ember modules API polyfill', function() {
      it("does not transpile deprecate debug tooling import paths", co.wrap(function* () {
        input.write({
          "foo.js": `import { deprecate } from '@ember/debug';\ndeprecate('some message', false, {\n  id: 'special-thing',\n  until: '1.0.0'\n});`,
          "bar.js": `import { deprecate } from '@ember/application/deprecations';\ndeprecate('some message', false, {\n  id: 'special-thing',\n  until: '1.0.0'\n});`,
        });

        subject = this.addon.transpileTree(input.path(), {
          'ember-cli-babel': {
            compileModules: false,
            disableDebugTooling: true,
          }
        });

        output = createBuilder(subject);

        yield output.build();

        expect(
          output.read()
        ).to.deep.equal({
          "foo.js": `import { deprecate } from '@ember/debug';\ndeprecate('some message', false, {\n  id: 'special-thing',\n  until: '1.0.0'\n});`,
          "bar.js": `import { deprecate } from '@ember/application/deprecations';\ndeprecate('some message', false, {\n  id: 'special-thing',\n  until: '1.0.0'\n});`,
        });
      }));

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
        expect(contents).to.include('inspect.call');
        expect(contents).to.not.include('assert');
      }));
    });

    describe("Opting out of the ember modules API polyfill", function () {
      it(
        "should replace imports with Ember Globals",
        co.wrap(function* () {
          dependencies[
            "ember-source"
          ] = PRE_EMBER_MODULE_IMPORTS_VERSION;
          input.write(
            buildEmberSourceFixture(PRE_EMBER_MODULE_IMPORTS_VERSION)
          );
          input.write({
            "foo.js": `import Component from '@ember/component'; Component.extend()`,
            "app.js": `import Application from '@ember/application'; Application.extend()`,
          });

          subject = this.addon.transpileTree(input.path());
          output = createBuilder(subject);

          yield output.build();

          expect(output.read()).to.deep.equal({
            "foo.js": `define("foo", [], function () {\n  "use strict";\n\n  Ember.Component.extend();\n});`,
            "app.js": `define("app", [], function () {\n  "use strict";\n\n  Ember.Application.extend();\n});`,
            node_modules: {
              "ember-source": {
                "index.js":
                  'define("node_modules/ember-source/index", [], function () {\n  "use strict";\n\n  module.exports = {};\n});',
                "package.json": '{"name":"ember-source","version":"3.26.0"}',
              },
            },
          });
        })
      );

      it(
        "should not replace the imports with Ember Globals when using an ember-source version that supports it",
        co.wrap(function* () {
          dependencies[
            "ember-source"
          ] = POST_EMBER_MODULE_IMPORTS_VERSION;
          input.write(
            buildEmberSourceFixture(POST_EMBER_MODULE_IMPORTS_VERSION)
          );
          input.write({
            "foo.js": `import Component from '@ember/component'; Component.extend()`,
            "app.js": `import Application from '@ember/application'; Application.extend()`,
          });

          subject = this.addon.transpileTree(input.path());
          output = createBuilder(subject);

          yield output.build();

          expect(output.read()).to.deep.equal({
            "foo.js": `define("foo", ["@ember/component"], function (_component) {\n  "use strict";\n\n  _component.default.extend();\n});`,
            "app.js": `define("app", ["@ember/application"], function (_application) {\n  "use strict";\n\n  _application.default.extend();\n});`,
            node_modules: {
              "ember-source": {
                "index.js":
                  'define("node_modules/ember-source/index", [], function () {\n  "use strict";\n\n  module.exports = {};\n});',
                "package.json": '{"name":"ember-source","version":"3.27.0"}',
              },
            },
          });
        })
      );
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
            "foo.js": `define("foo", [], function () {\n  "use strict";\n\n  if (true /* DEBUG */) {\n    console.log('debug mode!');\n  }\n});`
          });
        }));

        it("should replace debug macros by default ", co.wrap(function* () {
          process.env.EMBER_ENV = 'development';

          input.write({
            "foo.js": stripIndent`
              import { assert } from '@ember/debug';
              assert('stuff here', isNotBad());
            `,
            "bar.js": stripIndent`
              import { deprecate } from '@ember/debug';
              deprecate(
                'foo bar baz',
                false,
                {
                  id: 'some-id',
                  until: '1.0.0',
                }
              );
            `,
            "baz.js": stripIndent`
              import { deprecate } from '@ember/application/deprecations';
              deprecate(
                'foo bar baz',
                false,
                {
                  id: 'some-id',
                  until: '1.0.0',
                }
              );
            `,
          });

          subject = this.addon.transpileTree(input.path());
          output = createBuilder(subject);

          yield output.build();

          expect(
            output.read()
          ).to.deep.equal({
            "bar.js": `define("bar", [], function () {\n  "use strict";\n\n  (true && !(false) && Ember.deprecate('foo bar baz', false, {\n    id: 'some-id',\n    until: '1.0.0'\n  }));\n});`,
            "baz.js": `define("baz", [], function () {\n  "use strict";\n\n  (true && !(false) && Ember.deprecate('foo bar baz', false, {\n    id: 'some-id',\n    until: '1.0.0'\n  }));\n});`,
            "foo.js": `define("foo", [], function () {\n  "use strict";\n\n  (true && !(isNotBad()) && Ember.assert('stuff here', isNotBad()));\n});`,
          });
        }));

        it("should use modules for macros on Ember 3.27+", co.wrap(function* () {
          process.env.EMBER_ENV = 'development';

          dependencies[
            "ember-source"
          ] = POST_EMBER_MODULE_IMPORTS_VERSION;
          input.write(
            buildEmberSourceFixture(POST_EMBER_MODULE_IMPORTS_VERSION)
          );

          input.write({
            app: {
              "foo.js": stripIndent`
                import { assert } from '@ember/debug';
                assert('stuff here', isNotBad());
              `,
              "bar.js": stripIndent`
                import { deprecate } from '@ember/debug';
                deprecate(
                  'foo bar baz',
                  false,
                  {
                    id: 'some-id',
                    until: '1.0.0',
                  }
                );
              `,
              "baz.js": stripIndent`
                import { deprecate } from '@ember/application/deprecations';
                deprecate(
                  'foo bar baz',
                  false,
                  {
                    id: 'some-id',
                    until: '1.0.0',
                  }
                );
              `,
            },
          });

          subject = this.addon.transpileTree(input.path('app'));
          output = createBuilder(subject);

          yield output.build();

          expect(
            output.read()
          ).to.deep.equal({
            "bar.js": `define("bar", ["@ember/debug"], function (_debug) {\n  "use strict";\n\n  (true && !(false) && (0, _debug.deprecate)('foo bar baz', false, {\n    id: 'some-id',\n    until: '1.0.0'\n  }));\n});`,
            "baz.js": `define("baz", ["@ember/application/deprecations"], function (_deprecations) {\n  "use strict";\n\n  (true && !(false) && (0, _deprecations.deprecate)('foo bar baz', false, {\n    id: 'some-id',\n    until: '1.0.0'\n  }));\n});`,
            "foo.js": `define("foo", ["@ember/debug"], function (_debug) {\n  "use strict";\n\n  (true && !(isNotBad()) && (0, _debug.assert)('stuff here', isNotBad()));\n});`,
          });
        }));

        it("when transpiling with compileModules: false it should use Ember global for previously 'fake' imports even on Ember 3.27+", co.wrap(function* () {
          process.env.EMBER_ENV = 'development';

          dependencies[
            "ember-source"
          ] = POST_EMBER_MODULE_IMPORTS_VERSION;
          input.write(
            buildEmberSourceFixture(POST_EMBER_MODULE_IMPORTS_VERSION)
          );

          input.write({
            app: {
              "foo.js": stripIndent`
                import Component from '@ember/component';

                export default class extends Component {}
              `,
            },
          });

          this.addon.project.targets = {
            browsers: ['last 2 chrome versions']
          };

          subject = this.addon.transpileTree(input.path('app'), {
            'ember-cli-babel': {
              compileModules: false,
            }
          });
          output = createBuilder(subject);

          yield output.build();

          expect(
            output.read()
          ).to.deep.equal({
            "foo.js": `export default class extends Ember.Component {}`,
          });
        }));

        it("when transpiling with compileModules: false, disableEmberModulesAPIPolyfill: true it should not use Ember global for previously 'fake' imports", co.wrap(function* () {
          process.env.EMBER_ENV = 'development';

          dependencies[
            "ember-source"
          ] = POST_EMBER_MODULE_IMPORTS_VERSION;
          input.write(
            buildEmberSourceFixture(POST_EMBER_MODULE_IMPORTS_VERSION)
          );

          input.write({
            app: {
              "foo.js": stripIndent`
                import Component from '@ember/component';

                export default class extends Component {}
              `,
            },
          });

          this.addon.project.targets = {
            browsers: ['last 2 chrome versions']
          };

          subject = this.addon.transpileTree(input.path('app'), {
            'ember-cli-babel': {
              compileModules: false,
              disableEmberModulesAPIPolyfill: true,
            }
          });
          output = createBuilder(subject);

          yield output.build();

          expect(
            output.read()
          ).to.deep.equal({
            "foo.js": `import Component from '@ember/component';\nexport default class extends Component {}`,
          });
        }));

        it("when transpiling with compileModules: false, disableEmberModulesAPIPolyfill: false it should use global for Ember < 3.27", co.wrap(function* () {
          process.env.EMBER_ENV = 'development';

          dependencies[
            "ember-source"
          ] = PRE_EMBER_MODULE_IMPORTS_VERSION;
          input.write(
            buildEmberSourceFixture(PRE_EMBER_MODULE_IMPORTS_VERSION)
          );

          input.write({
            app: {
              "foo.js": stripIndent`
                import Component from '@ember/component';

                export default class extends Component {}
              `,
            },
          });

          this.addon.project.targets = {
            browsers: ['last 2 chrome versions']
          };

          subject = this.addon.transpileTree(input.path('app'), {
            'ember-cli-babel': {
              compileModules: false,
              disableEmberModulesAPIPolyfill: false,
            }
          });
          output = createBuilder(subject);

          yield output.build();

          expect(
            output.read()
          ).to.deep.equal({
            "foo.js": `export default class extends Ember.Component {}`,
          });
        }));

        it("when transpiling with compileModules: false, disableEmberModulesAPIPolyfill: false it should use global for Ember > 3.27", co.wrap(function* () {
          process.env.EMBER_ENV = 'development';

          dependencies[
            "ember-source"
          ] = POST_EMBER_MODULE_IMPORTS_VERSION;
          input.write(
            buildEmberSourceFixture(POST_EMBER_MODULE_IMPORTS_VERSION)
          );

          input.write({
            app: {
              "foo.js": stripIndent`
                import Component from '@ember/component';

                export default class extends Component {}
              `,
            },
          });

          this.addon.project.targets = {
            browsers: ['last 2 chrome versions']
          };

          subject = this.addon.transpileTree(input.path('app'), {
            'ember-cli-babel': {
              compileModules: false,
              disableEmberModulesAPIPolyfill: false,
            }
          });
          output = createBuilder(subject);

          yield output.build();

          expect(
            output.read()
          ).to.deep.equal({
            "foo.js": `import Component from '@ember/component';\nexport default class extends Component {}`,
          });
        }));

        it("when transpiling with compileModules: false, disableDebugTooling: false it should use modules for debug tooling", co.wrap(function* () {
          process.env.EMBER_ENV = 'development';

          dependencies[
            "ember-source"
          ] = POST_EMBER_MODULE_IMPORTS_VERSION;
          input.write(
            buildEmberSourceFixture(POST_EMBER_MODULE_IMPORTS_VERSION)
          );

          input.write({
            app: {
              "foo.js": stripIndent`
                import { assert } from '@ember/debug';
                assert('stuff here', isNotBad());
              `,
              "bar.js": stripIndent`
                import { deprecate } from '@ember/debug';
                deprecate(
                  'foo bar baz',
                  false,
                  {
                    id: 'some-id',
                    until: '1.0.0',
                  }
                );
              `,
              "baz.js": stripIndent`
                import { deprecate } from '@ember/application/deprecations';
                deprecate(
                  'foo bar baz',
                  false,
                  {
                    id: 'some-id',
                    until: '1.0.0',
                  }
                );
              `,
            },
          });

          subject = this.addon.transpileTree(input.path('app'), {
            'ember-cli-babel': {
              compileModules: false,
              disableDebugTooling: false,
            }
          });
          output = createBuilder(subject);

          yield output.build();

          expect(
            output.read()
          ).to.deep.equal({
            "bar.js": `import { deprecate } from '@ember/debug';\n(true && !(false) && deprecate('foo bar baz', false, {\n  id: 'some-id',\n  until: '1.0.0'\n}));`,
            "baz.js": `import { deprecate } from '@ember/application/deprecations';\n(true && !(false) && deprecate('foo bar baz', false, {\n  id: 'some-id',\n  until: '1.0.0'\n}));`,
            "foo.js": `import { assert } from '@ember/debug';\n(true && !(isNotBad()) && assert('stuff here', isNotBad()));`,
          });
        }));

        it("when transpiling with compileModules: false, disableDebugTooling: true it should not use Ember global for debug tooling", co.wrap(function* () {
          process.env.EMBER_ENV = 'development';

          dependencies[
            "ember-source"
          ] = POST_EMBER_MODULE_IMPORTS_VERSION;
          input.write(
            buildEmberSourceFixture(POST_EMBER_MODULE_IMPORTS_VERSION)
          );

          input.write({
            app: {
              "foo.js": stripIndent`
                import { assert } from '@ember/debug';
                assert('stuff here', isNotBad());
              `,
              "bar.js": stripIndent`
                import { deprecate } from '@ember/debug';
                deprecate(
                  'foo bar baz',
                  false,
                  {
                    id: 'some-id',
                    until: '1.0.0',
                  }
                );
              `,
              "baz.js": stripIndent`
                import { deprecate } from '@ember/application/deprecations';
                deprecate(
                  'foo bar baz',
                  false,
                  {
                    id: 'some-id',
                    until: '1.0.0',
                  }
                );
              `,
            },
          });

          subject = this.addon.transpileTree(input.path('app'), {
            'ember-cli-babel': {
              compileModules: false,
              disableDebugTooling: true,
            }
          });
          output = createBuilder(subject);

          yield output.build();

          expect(
            output.read()
          ).to.deep.equal({
            "bar.js": `import { deprecate } from '@ember/debug';\ndeprecate('foo bar baz', false, {\n  id: 'some-id',\n  until: '1.0.0'\n});`,
            "baz.js": `import { deprecate } from '@ember/application/deprecations';\ndeprecate('foo bar baz', false, {\n  id: 'some-id',\n  until: '1.0.0'\n});`,
            "foo.js": `import { assert } from '@ember/debug';\nassert('stuff here', isNotBad());`,
          });
        }));

        it("when transpiling with compileModules: false, it should use Ember global even on Ember 3.27+", co.wrap(function* () {
          process.env.EMBER_ENV = 'development';

          dependencies[
            "ember-source"
          ] = POST_EMBER_MODULE_IMPORTS_VERSION;
          input.write(
            buildEmberSourceFixture(POST_EMBER_MODULE_IMPORTS_VERSION)
          );

          input.write({
            app: {
              "foo.js": stripIndent`
                import { assert } from '@ember/debug';
                assert('stuff here', isNotBad());
              `,
              "bar.js": stripIndent`
                import { deprecate } from '@ember/debug';
                deprecate(
                  'foo bar baz',
                  false,
                  {
                    id: 'some-id',
                    until: '1.0.0',
                  }
                );
              `,
              "baz.js": stripIndent`
                import { deprecate } from '@ember/application/deprecations';
                deprecate(
                  'foo bar baz',
                  false,
                  {
                    id: 'some-id',
                    until: '1.0.0',
                  }
                );
              `,
            },
          });

          subject = this.addon.transpileTree(input.path('app'), {
            'ember-cli-babel': {
              compileModules: false,
            }
          });
          output = createBuilder(subject);

          yield output.build();

          expect(
            output.read()
          ).to.deep.equal({
            "bar.js": `(true && !(false) && Ember.deprecate('foo bar baz', false, {\n  id: 'some-id',\n  until: '1.0.0'\n}));`,
            "baz.js": `(true && !(false) && Ember.deprecate('foo bar baz', false, {\n  id: 'some-id',\n  until: '1.0.0'\n}));`,
            "foo.js": `(true && !(isNotBad()) && Ember.assert('stuff here', isNotBad()));`,
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
            "foo.js": `define("foo", [], function () {\n  "use strict";\n\n  if (false /* DEBUG */) {\n    console.log('debug mode!');\n  }\n});`
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
          addons: [],
          targets: {
            browsers: ['ie 11'],
          },
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
          addons: [ ],
          targets: {
            browsers: ['ie 11'],
          },
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

      beforeEach(function() {
        dependencies = {};
        let project = {
          root: input.path(),
          emberCLIVersion: () => '2.16.2',
          dependencies() { return dependencies; },
          addons: [],
          targets: {
            browsers: ['ie 11'],
          },
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
          addons: [ ],
          targets: {
            browsers: ['ie 11'],
          },
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

    describe('TypeScript transpilation', function() {
      let input;
      let output;
      let subject;
      let project;
      let unlink;

      beforeEach(co.wrap(function*() {
        let fixturifyProject = new FixturifyProject('whatever', '0.0.1');
        fixturifyProject.addDependency('ember-cli-typescript', '4.0.0-alpha.1', addon => {
          return prepareAddon(addon);
        });
        fixturifyProject.addDependency('ember-cli-babel', 'babel/ember-cli-babel#master');
        let pkg = JSON.parse(fixturifyProject.toJSON('package.json'));
        fixturifyProject.writeSync();

        let linkPath = path.join(fixturifyProject.root, 'whatever/node_modules/ember-cli-babel');
        let addonPath = path.resolve(__dirname, '../');
        rimraf.sync(linkPath);
        fs.symlinkSync(addonPath, linkPath, 'junction');
        unlink = () => {
          fs.unlinkSync(linkPath);
        };

        let cli = new MockCLI();
        let root = path.join(fixturifyProject.root, 'whatever');
        project = new EmberProject(root, pkg, cli.ui, cli);
        project.initializeAddons();
        this.addon = project.addons.find(a => { return a.name === 'ember-cli-babel'; });
        input = yield createTempDir();
      }));

      afterEach(co.wrap(function*() {
        unlink();

        if (input) {
          yield input.dispose();
        }

        if (output) {
          yield output.dispose();
        }

        // shut down workers after the tests are run so that mocha doesn't hang
        yield terminateWorkerPool();
      }));

      it('should transpile .ts files', co.wrap(function*() {
        input.write({ 'foo.ts': `let foo: string = "hi";` });

        subject = this.addon.transpileTree(input.path());
        output = createBuilder(subject);

        yield output.build();

        expect(
          output.read()
        ).to.deep.equal({
          'foo.js': `define("foo", [], function () {\n  "use strict";\n\n  var foo = "hi";\n});`
        });
      }));

      it('should exclude .d.ts files', co.wrap(function*() {
        input.write({ 'foo.d.ts': `declare let foo: string;` });

        subject = this.addon.transpileTree(input.path());
        output = createBuilder(subject);

        yield output.build();

        expect(output.read()).to.deep.equal({});
      }))
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
            disableEmberModulesAPIPolyfill: true,
            disableDecoratorTransforms: true,
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

  describe('getSupportedExtensions', function() {
    it('defaults to js only', function() {
      expect(this.addon.getSupportedExtensions()).to.have.members(['js']);
    });

    it('adds ts automatically', function() {
      this.addon._shouldHandleTypeScript = function() { return true; }

      expect(this.addon.getSupportedExtensions({ 'ember-cli-babel': { enableTypeScriptTransform: true }})).to.have.members(['js', 'ts']);
    });

    it('respects user-configured extensions', function() {
      expect(this.addon.getSupportedExtensions({ 'ember-cli-babel': { extensions: ['coffee'] } })).to.have.members(['coffee']);
    });

    it('respects user-configured extensions even when adding TS plugin', function() {
      expect(this.addon.getSupportedExtensions({ 'ember-cli-babel': { enableTypeScriptTransform: true, extensions: ['coffee'] } })).to.have.members(['coffee']);
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

  describe('_shouldHandleTypeScript', function() {
    let project;
    let unlink;

    let setupTsAddon = function*(context, version = '4.0.0-alpha.1') {
      let fixturifyProject = new FixturifyProject('whatever', '0.0.1');
      fixturifyProject.addDependency('ember-cli-typescript', version, addon => {
        return prepareAddon(addon);
      });
      fixturifyProject.addDependency('ember-cli-babel', 'babel/ember-cli-babel#master');
      let pkg = JSON.parse(fixturifyProject.toJSON('package.json'));
      fixturifyProject.writeSync();

      let linkPath = path.join(fixturifyProject.root, 'whatever/node_modules/ember-cli-babel');
      let addonPath = path.resolve(__dirname, '../');
      rimraf.sync(linkPath);
      fs.symlinkSync(addonPath, linkPath, 'junction');
      unlink = () => {
        fs.unlinkSync(linkPath);
      };

      let cli = new MockCLI();
      let root = path.join(fixturifyProject.root, 'whatever');
      project = new EmberProject(root, pkg, cli.ui, cli);
      project.initializeAddons();
      context.addon = project.addons.find(a => { return a.name === 'ember-cli-babel'; });
      input = yield createTempDir();
    }

    afterEach(co.wrap(function*() {
      if (unlink) {
        unlink();
        unlink = undefined;
      }

      // shut down workers after the tests are run so that mocha doesn't hang
      yield terminateWorkerPool();
    }));

    it('should return false by default', function() {
      expect(_shouldHandleTypeScript({}, this.addon.parent, this.addon.project)).to.be.false;
    });
    it('should return true when ember-cli-typescript >= 4.0.0-alpha.1 is installed', function*() {
      yield setupTsAddon(this);
      expect(_shouldHandleTypeScript({}, this.addon.parent, this.addon.project)).to.be.true;
    });
    it('should return false when ember-cli-typescript < 4.0.0-alpha.1 is installed', function*() {
      yield setupTsAddon(this, '3.0.0');
      expect(_shouldHandleTypeScript({}, this.addon.parent, this.addon.project)).to.be.false;
    });
    it('should return true when the TypeScript transform is manually enabled', function*() {
      yield setupTsAddon(this, '3.0.0');
      expect(_shouldHandleTypeScript({ 'ember-cli-babel': { enableTypeScriptTransform: true } }, this.addon.parent, this.addon.project)).to.be.true;
    });

    it('should return false when the TypeScript transforms is manually disabled', function() {
      expect(_shouldHandleTypeScript({ 'ember-cli-babel': { enableTypeScriptTransform: false } }, this.addon.parent, this.addon.project)).to.be.false;
    });

    it('should return false when the TypeScript transform is manually disabled, even when ember-cli-typescript >= 4.0.0-alpha.1 is installed', function*() {
      yield setupTsAddon(this, '4.1.0');
      expect(_shouldHandleTypeScript({ 'ember-cli-babel': { enableTypeScriptTransform: false } }, this.addon.parent, this.addon.project)).to.be.false;
    });
  });

  describe('_shouldIncludeHelpers()', function() {
    beforeEach(function() {
      this.addon.app = {
        options: {}
      };
    });

    it('should return false without any includeExternalHelpers option set', function() {
      expect(_shouldIncludeHelpers({}, this.addon)).to.be.false;
    });

    it('should throw an error with ember-cli-babel.includeExternalHelpers = true in parent', function() {
      this.addon.parent.options = { 'ember-cli-babel': { includeExternalHelpers: true } };

      expect(() => _shouldIncludeHelpers({}, this.addon)).to.throw;
    });

    it('should return true with ember-cli-babel.includeExternalHelpers = true in app and ember-cli-version is high enough', function() {
      this.addon.pkg = { version: '7.3.0-beta.1' };

      this.addon.app.options = { 'ember-cli-babel': { includeExternalHelpers: true } };

      expect(_shouldIncludeHelpers({}, this.addon)).to.be.true;
    });

    it('should return false when compileModules is false', function() {
      this.addon.pkg = { version: '7.3.0-beta.1' };

      this.addon.app.options = { 'ember-cli-babel': { includeExternalHelpers: true } };

      // precond
      expect(_shouldIncludeHelpers({}, this.addon)).to.be.true;

      expect(_shouldIncludeHelpers({ 'ember-cli-babel': { compileModules: false } }, this.addon)).to.be.false;
    });

    it('should return false with ember-cli-babel.includeExternalHelpers = true in app and write warn line if ember-cli-version is not high enough', function() {
      this.addon.project.name = 'dummy';
      this.addon.project.ui = {
        writeWarnLine(message) {
          expect(message).to.match(/dummy attempted to include external babel helpers/);
        }
      };

      this.addon.app.options = { 'ember-cli-babel': { includeExternalHelpers: true } };

      expect(_shouldIncludeHelpers({}, this.addon)).to.be.false;
    });

    it('should return false with ember-cli-babel.includeExternalHelpers = false in host', function() {
      this.addon.app.options = { 'ember-cli-babel': { includeExternalHelpers: false } };

      expect(_shouldIncludeHelpers({}, this.addon)).to.be.false;
    });

    it('should work when the host app does not include ember-cli-babel', function() {
      this.addon.project.addons = [];

      expect(_shouldIncludeHelpers({}, this.addon)).to.be.false;
    });

    describe('autodetection', function() {
      it('should return true if @ember-decorators/babel-transforms exists and ember-cli-babel version is high enough', function() {
        this.addon.pkg = { version: '7.3.0-beta.1' };
        this.addon.project.addons.push({
          pkg: {
            name: '@ember-decorators/babel-transforms'
          }
        });

        expect(_shouldIncludeHelpers({}, this.addon)).to.be.true;
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

        expect(_shouldIncludeHelpers({}, this.addon)).to.be.false;
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
        expect(_shouldCompileModules({
          'ember-cli-babel': { compileModules: true }
        }, this.addon.project)).to.eql(true);
      });

      it('should not print deprecation messages', function() {
        _shouldCompileModules({
          'ember-cli-babel': { compileModules: true }
        }, this.addon.project);

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

  describe('_getExtensions', function() {
    it('defaults to js only', function() {
      expect(_getExtensions({}, this.addon.parent, this.addon.project)).to.have.members(['js']);
    });
    it('adds ts automatically', function() {
      this.addon._shouldHandleTypeScript = function() { return true; }
      expect(_getExtensions({ 'ember-cli-babel': { enableTypeScriptTransform: true } }, this.addon.parent, this.addon.project)).to.have.members(['js', 'ts']);
    });
    it('respects user-configured extensions', function() {
      expect(_getExtensions({ 'ember-cli-babel': { extensions: ['coffee'] } }, this.addon.parent, this.addon.project)).to.have.members(['coffee']);
    });
    it('respects user-configured extensions even when adding TS plugin', function() {
      expect(_getExtensions({ 'ember-cli-babel': { enableTypeScriptTransform: true, extensions: ['coffee'] } }, this.addon.parent, this.addon.project)).to.have.members(['coffee']);
    });
  });

  describe('_buildBroccoliBabelTranspilerOptions', function() {
    this.timeout(0);

    it('disables reading `.babelrc`', function() {
      let options = {};

      let result = this.addon._buildBroccoliBabelTranspilerOptions(options);

      expect(result.babelrc).to.be.false;
    });

    it('provides an annotation including parent name - addon', function() {
      this.addon.parent = Object.assign({}, this.addon.parent, {
        name: 'derpy-herpy',
        dependencies() { return {}; },
      });
      let result = this.addon._buildBroccoliBabelTranspilerOptions();
      expect(result.annotation).to.include('derpy-herpy');
    });

    it('provides an annotation including parent name - project', function() {
      this.addon.parent = Object.assign({}, this.addon.parent, {
        name: 'derpy-herpy',
        dependencies() { return {}; },
      });
      let result = this.addon._buildBroccoliBabelTranspilerOptions();
      expect(result.annotation).to.include('derpy-herpy');
    });

    it('uses provided annotation if specified', function() {
      let options = {
        'ember-cli-babel': {
          annotation: 'Hello World!'
        }
      };

      let result = this.addon._buildBroccoliBabelTranspilerOptions(options);
      expect(result.annotation).to.equal('Hello World!');
    });

    it('uses provided sourceMaps if specified', function() {
      let options = {
        babel: {
          sourceMaps: 'inline'
        }
      };

      let result = this.addon._buildBroccoliBabelTranspilerOptions(options);
      expect(result.sourceMaps).to.equal('inline');
    });

    it('disables reading `.babelrc`', function() {
      let options = {};

      let result = this.addon._buildBroccoliBabelTranspilerOptions(options);

      expect(result.babelrc).to.be.false;
    });
  });

  describe('buildBabelOptions', function() {
    this.timeout(0);

    it('returns broccoli-babel-transpiler options by default', function() {
      this.addon.parent = { ...this.addon.parent, name: 'foo' };

      let result = this.addon.buildBabelOptions();

      expect(result.annotation).to.equal('Babel: foo');
      expect(result.moduleIds).to.be.true;
      expect(result.babelrc).to.be.false;
      expect(result.configFile).to.be.false;
    });

    it('returns broccoli-babel-transpiler options when asked for', function() {
      this.addon.parent = { ...this.addon.parent, name: 'foo' };

      let result = this.addon.buildBabelOptions('broccoli');

      expect(result.annotation).to.equal('Babel: foo');
      expect(result.moduleIds).to.be.true;
      expect(result.babelrc).to.be.false;
      expect(result.configFile).to.be.false;
    });

    it('returns broccoli-babel-transpiler options with customizations when provided', function() {
      let result = this.addon.buildBabelOptions('broccoli', {
        'ember-cli-babel': {
          annotation: 'hello!!!',
        }
      });

      expect(result.annotation).to.equal('hello!!!');
      expect(result.moduleIds).to.be.true;
      expect(result.babelrc).to.be.false;
      expect(result.configFile).to.be.false;
    });

    it('returns babel options when asked for', function() {
      let result = this.addon.buildBabelOptions('babel');

      expect('moduleIds' in result).to.be.false;
      expect('annotation' in result).to.be.false;
      expect('babelrc' in result).to.be.false;
      expect('configFile' in result).to.be.false;
    });

    it('does not include all provided options', function() {
      let babelOptions = { blah: true };
      let options = {
        babel: babelOptions
      };

      let result = this.addon.buildBabelOptions('babel', options);
      expect(result.blah).to.be.undefined;
    });

    it('does not include all provided options', function() {
      let babelOptions = { blah: true };
      this.addon.parent = Object.assign({}, this.addon.parent, {
        dependencies() { return {}; },
        options: {
          babel: babelOptions,
        },
      });

      let result = this.addon.buildBabelOptions();
      expect(result.blah).to.be.undefined;
    });

    it('includes user plugins in parent.options.babel.plugins', function() {
      let plugin = {};
      this.addon.parent = Object.assign({}, this.addon.parent, {
        dependencies() { return {}; },
        options: {
          babel: {
            plugins: [ plugin ]
          },
        },
      });

      let result = this.addon.buildBabelOptions();
      expect(result.plugins).to.deep.include(plugin);
    });

    it('includes postTransformPlugins after preset-env plugins', function() {
      let plugin = {};
      let pluginAfter = {};
      this.addon.parent = Object.assign({}, this.addon.parent, {
        dependencies() { return {}; },
        options: {
          babel: {
            plugins: [ plugin ],
            postTransformPlugins: [ pluginAfter ]
          },
        },
      });

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
      this.addon.parent = Object.assign({}, this.addon.parent, {
        dependencies() { return {}; },
        options: {
          babel6: {
            plugins: [ {} ]
          },
        },
      });

      let result = this.addon.buildBabelOptions(options);
      expect(result.presets).to.deep.equal([]);
    });

    it('user plugins are before preset-env plugins', function() {
      let plugin = function Plugin() {};
      this.addon.parent = Object.assign({}, this.addon.parent, {
        dependencies() { return {}; },
        options: {
          babel: {
            plugins: [ plugin ]
          },
        },
      });

      let result = this.addon.buildBabelOptions();
      expect(result.plugins[0]).to.equal(plugin);
    });

    it('includes resolveModuleSource if compiling modules', function() {

      let expectedPlugin = require.resolve('babel-plugin-module-resolver');

      let result = this.addon.buildBabelOptions({
        'ember-cli-babel': {
          compileModules: true,
        }
      });
      let found = result.plugins.find(plugin => plugin[0] === expectedPlugin);

      expect(typeof found[1].resolvePath).to.equal('function');
    });

    it('does not include resolveModuleSource when not compiling modules', function() {

      let expectedPlugin = require('babel-plugin-module-resolver').default;

      let result = this.addon.buildBabelOptions({
        'ember-cli-babel': {
          compileModules: false,
        }
      });
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
      this.addon.parent = Object.assign({}, this.addon.parent, {
        dependencies() { return {}; },
        options: {
          babel: babelOptions,
        },
      });

      let options = this.addon.buildBabelOptions();

      expect(options.presets).to.deep.equal([
        [require.resolve('@babel/preset-env'), {
          loose: true,
          modules: false,
          targets: { browsers: ['ie 11'] },
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

    it('defensively copies `targets` to prevent @babel/helper-compilation-functions mutating it', function() {
      let targets = {
        browsers: ['last 2 Chrome versions']
      };
      this.addon.project.targets = clone(targets);

      this.addon.isPluginRequired('transform-regenerator');
      expect(this.addon.project.targets).to.deep.equal(targets);
    });
  });
});

describe('EmberData Packages Polyfill', function() {
  this.timeout(0);

  let input;
  let output;
  let subject;
  let setupForVersion;
  let project;
  let unlink;

  beforeEach(function() {
    let self = this;
    setupForVersion = co.wrap(function*(v) {
      let fixturifyProject = new FixturifyProject('whatever', '0.0.1');
      fixturifyProject.addDependency('ember-data', v, addon => {
        return prepareAddon(addon);
      });
      fixturifyProject.addDependency('ember-cli-babel', 'babel/ember-cli-babel#master');
      fixturifyProject.addDependency('random-addon', '0.0.1', addon => {
        return prepareAddon(addon);
      });
      let pkg = JSON.parse(fixturifyProject.toJSON('package.json'));
      fixturifyProject.writeSync();

      let linkPath = path.join(fixturifyProject.root, '/whatever/node_modules/ember-cli-babel');
      let addonPath = path.resolve(__dirname, '../');
      rimraf.sync(linkPath);
      fs.symlinkSync(addonPath, linkPath, 'junction');
      unlink = () => {
        fs.unlinkSync(linkPath);
      };

      let cli = new MockCLI();
      let root = path.join(fixturifyProject.root, 'whatever');
      project = new EmberProject(root, pkg, cli.ui, cli);
      project.initializeAddons();

      self.addon = project.addons.find(a => { return a.name === 'ember-cli-babel'; });

      input = yield createTempDir();
    });
  });

  afterEach(co.wrap(function*() {
    unlink();

    if (input) {
      yield input.dispose();
    }

    if (output) {
      yield output.dispose();
    }

    // shut down workers after the tests are run so that mocha doesn't hang
    yield terminateWorkerPool();
  }));

  it("does not convert when _emberDataVersionRequiresPackagesPolyfill returns false", co.wrap(function*() {
    yield setupForVersion('3.12.0-alpha.0');
    input.write({
      "foo.js": `export { default } from '@ember-data/store';`,
      "bar.js": `import Model, { attr } from '@ember-data/model';\nexport var User = Model;\nexport var name = attr;`,
    });

    subject = this.addon.transpileTree(input.path(), {
      'ember-cli-babel': {
        compileModules: false,
        disableDebugTooling: true,
        disableEmberDataPackagesPolyfill: true
      }
    });

    output = createBuilder(subject);

    yield output.build();

    expect(
      output.read()
    ).to.deep.equal({
      "foo.js": `export { default } from '@ember-data/store';`,
      "bar.js": `import Model, { attr } from '@ember-data/model';\nexport var User = Model;\nexport var name = attr;`,
    });
  }));

  it("does not convert for EmberData when _emberDataVersionRequiresPackagesPolyfill returns true and disableEmberDataPackagesPolyfill is true", co.wrap(function*() {
    yield setupForVersion('3.11.0');
    input.write({
      "foo.js": `export { default } from '@ember-data/store';`,
      "bar.js": `import Model, { attr } from '@ember-data/model';\nexport var User = Model;\nexport var name = attr;`,
    });

    subject = this.addon.transpileTree(input.path(), {
      'ember-cli-babel': {
        compileModules: false,
        disableDebugTooling: true,
        disableEmberDataPackagesPolyfill: true
      }
    });

    output = createBuilder(subject);

    yield output.build();

    expect(
      output.read()
    ).to.deep.equal({
      "foo.js": `export { default } from '@ember-data/store';`,
      "bar.js": `import Model, { attr } from '@ember-data/model';\nexport var User = Model;\nexport var name = attr;`,
    });
  }));

  it("it does convert for EmberData when _emberDataVersionRequiresPackagesPolyfill returns true", co.wrap(function*() {
    yield setupForVersion('3.11.99');
    input.write({
      "foo.js": `export { default } from '@ember-data/store';`,
      "bar.js": `import Model, { attr } from '@ember-data/model';\nexport var User = Model;export var name = attr;`,
    });

    subject = this.addon.transpileTree(input.path(), {
      'ember-cli-babel': {
        compileModules: false,
        disableDebugTooling: true,
      }
    });

    output = createBuilder(subject);

    yield output.build();

    expect(
      output.read()
    ).to.deep.equal({
      "foo.js": `import DS from "ember-data";\nexport default DS.Store;`,
      "bar.js": `import DS from "ember-data";\nvar Model = DS.Model;\nvar attr = DS.attr;\nexport var User = Model;\nexport var name = attr;`,
    });
  }));

  it("conversion works with compilation to AMD modules", co.wrap(function*() {
    yield setupForVersion('3.11.99');
    input.write({
      "foo.js": `export { default } from '@ember-data/store';`,
      "bem.js": `export { default } from 'ember-data';`,
      "bar.js": `import Model, { attr } from '@ember-data/model';\nexport var User = Model;export var name = attr;`,
      "baz.js": `import EmberData from 'ember-data';\nexport var User = EmberData.Model;`,
    });

    subject = this.addon.transpileTree(input.path(), {
      'ember-cli-babel': {
        compileModules: true,
        disableDebugTooling: true,
      }
    });

    output = createBuilder(subject);

    yield output.build();

   function moduleOutput(moduleName, transpiledModuleBodyCode) {
     return `define("${moduleName}", ["exports", "ember-data"], function (_exports, _emberData) {\n  "use strict";\n\n  Object.defineProperty(_exports, "__esModule", {\n    value: true\n  });\n${transpiledModuleBodyCode}\n});`
   }

   let fooOutput = moduleOutput(
     'foo',
      assembleLines([
        `_exports.default = void 0;`,
        `var _default = _emberData.default.Store;`,
        `_exports.default = _default;`
      ])
    );
   let bemOutput = moduleOutput(
     'bem',
     assembleLines([
       `Object.defineProperty(_exports, "default", {`,
       `  enumerable: true,`,
       `  get: function get() {`,
       `    return _emberData.default;`,
       `  }`,
       `});`
     ])
   );
   let barOutput = moduleOutput(
     'bar',
     assembleLines([
      `_exports.name = _exports.User = void 0;`,
      `var Model = _emberData.default.Model;`,
      `var attr = _emberData.default.attr;`,
      `var User = Model;`,
      `_exports.User = User;`,
      `var name = attr;`,
      `_exports.name = name;`
     ])
    );
   let bazOutput = moduleOutput(
     'baz',
     assembleLines([
       `_exports.User = void 0;`,
       `var EmberData = _emberData.default;`,
       `var User = EmberData.Model;`,
       `_exports.User = User;`
     ])
   );

   let transpiled = output.read();
    expect(transpiled['foo.js']).to.equal(fooOutput);
    expect(transpiled['bem.js']).to.equal(bemOutput);
    expect(transpiled['bar.js']).to.equal(barOutput);
    expect(transpiled['baz.js']).to.equal(bazOutput);
  }));
});

describe('EmberData Packages Polyfill - ember-cli-babel for ember-data', function() {
  this.timeout(0);

  let input;
  let output;
  let subject;
  let setupForVersion;
  let project;
  let unlink;

  beforeEach(function() {
    let self = this;
    setupForVersion = co.wrap(function*(p, v) {
      let fixturifyProject = new FixturifyProject('whatever', '0.0.1');
      let emberDataFixture = fixturifyProject.addDependency(p, v, addon => {
        return prepareAddon(addon);
      });
      emberDataFixture.addDependency('ember-cli-babel', 'babel/ember-cli-babel#master');
      fixturifyProject.addDependency('random-addon', '0.0.1', addon => {
        return prepareAddon(addon);
      });
      let pkg = JSON.parse(fixturifyProject.toJSON('package.json'));
      fixturifyProject.writeSync();

      let linkPath = path.join(fixturifyProject.root, `/whatever/node_modules/${p}/node_modules/ember-cli-babel`);
      let addonPath = path.resolve(__dirname, '../');
      rimraf.sync(linkPath);
      fs.symlinkSync(addonPath, linkPath, 'junction');
      unlink = () => {
        fs.unlinkSync(linkPath);
      };

      let cli = new MockCLI();
      let root = path.join(fixturifyProject.root, 'whatever');
      project = new EmberProject(root, pkg, cli.ui, cli);
      project.initializeAddons();

      self.emberDataAddon = project.addons.find(a => { return a.name === p; });
      self.emberDataAddon.initializeAddons();
      self.addon = self.emberDataAddon.addons.find(a => { return a.name === 'ember-cli-babel'; });

      input = yield createTempDir();
    });
  });

  afterEach(co.wrap(function*() {
    unlink();

    if (input) {
      yield input.dispose();
    }

    if (output) {
      yield output.dispose();
    }

    // shut down workers after the tests are run so that mocha doesn't hang
    yield terminateWorkerPool();
  }));

  ['ember-data', '@ember-data/store'].forEach(parentDep => {
    it(`does not convert when compiling ${parentDep} itself`, co.wrap(function*() {
      yield setupForVersion(parentDep, '3.10.0');

      input.write({
        "foo.js": `export { default } from '@ember-data/store';`,
        "bar.js": `import Model, { attr } from '@ember-data/model';\nexport var User = Model;\nexport var name = attr;`,
        "bem.js": `export { AdapterError } from 'ember-data/-private';`,
      });

      subject = this.addon.transpileTree(input.path(), {
        'ember-cli-babel': {
          compileModules: false,
          disableDebugTooling: true,
        }
      });

      output = createBuilder(subject);

      yield output.build();

      expect(
        output.read()
      ).to.deep.equal({
        "foo.js": `export { default } from '@ember-data/store';`,
        "bar.js": `import Model, { attr } from '@ember-data/model';\nexport var User = Model;\nexport var name = attr;`,
        "bem.js": `export { AdapterError } from 'ember-data/-private';`,
      });
    }));
  });
});

describe('babel config file', function() {
  this.timeout(0);

  let input;
  let output;
  let subject;
  let setupForVersion;
  let project;
  let unlink;

  beforeEach(function() {
    let self = this;
    setupForVersion = co.wrap(function*(plugins) {
      let fixturifyProject = new FixturifyProject('whatever', '0.0.1');

      fixturifyProject.addDependency('ember-cli-babel', 'babel/ember-cli-babel#master');
      fixturifyProject.addDependency('random-addon', '0.0.1', addon => {
        return prepareAddon(addon);
      });
      let pkg = JSON.parse(fixturifyProject.toJSON('package.json'));
      fixturifyProject.files['babel.config.js'] =
      `module.exports = function (api) {
        api.cache(true);
        return {
          plugins: [
            ${plugins}
          ],
        };
      };
      `;
      const packageDir = path.dirname(require.resolve(path.join("@babel/plugin-transform-modules-amd", 'package.json')));
      // symlink the "@babel/plugin-transform-modules-amd" dependency into the project
      // TODO: Move this function out so that it can be used by other tests in the future.
      const writeSync = function () {
        let stack = [];
        fixturifyProject.writeSync();
        ensureSymlinkSync(
          packageDir,
          path.join(
            fixturifyProject.root,
            fixturifyProject.name,
            "node_modules",
            "@babel/plugin-transform-modules-amd"
          ),
          "dir"
        );
        for (let dep of fixturifyProject.dependencies()) {
          stack.push({
            project: dep,
            root: path.join(
              fixturifyProject.root,
              fixturifyProject.name,
              "node_modules"
            ),
          });
        }
      };

      writeSync(fixturifyProject)

      let linkPath = path.join(fixturifyProject.root, '/whatever/node_modules/ember-cli-babel');
      let addonPath = path.resolve(__dirname, '../');
      rimraf.sync(linkPath);
      fs.symlinkSync(addonPath, linkPath, 'junction');
      unlink = () => {
        fs.unlinkSync(linkPath);
      };

      let cli = new MockCLI();
      let root = path.join(fixturifyProject.root, 'whatever');
      project = new EmberProject(root, pkg, cli.ui, cli);
      project.initializeAddons();

      self.addon = project.addons.find(a => { return a.name === 'ember-cli-babel'; });
      self.addon.parent.options = {
        "ember-cli-babel": { useBabelConfig: true },
      };

      input = yield createTempDir();
    });
  });

  afterEach(co.wrap(function*() {
    unlink();

    if (input) {
      yield input.dispose();
    }

    if (output) {
      yield output.dispose();
    }

    // shut down workers after the tests are run so that mocha doesn't hang
    yield terminateWorkerPool();
  }));

  it("should transpile to amd modules based on babel config", co.wrap(function* () {
    yield setupForVersion(`[
      require.resolve("@babel/plugin-transform-modules-amd"),
      { noInterop: true },
    ]`);
    input.write({
      "foo.js": `export default {};`,
    });

    subject = this.addon.transpileTree(input.path());
    output = createBuilder(subject);

    yield output.build();

    expect(output.read()).to.deep.equal({
      "foo.js": `define(\"foo\", [\"exports\"], function (_exports) {\n  \"use strict\";\n\n  Object.defineProperty(_exports, \"__esModule\", {\n    value: true\n  });\n  _exports.default = void 0;\n  var _default = {};\n  _exports.default = _default;\n});`,
    });
  }));

  it("should not transpile to amd modules based on babel config", co.wrap(function* () {
    yield setupForVersion('');
    input.write({
      "foo.js": `export default {};`,
    });

    subject = this.addon.transpileTree(input.path());
    output = createBuilder(subject);

    yield output.build();

    expect(
      output.read()
    ).to.deep.equal({
      "foo.js": "export default {};"
    });
  }));

  it("should not use babel config (even if present) if the 'useBabelConfig' option is set to false", co.wrap(function* () {
    yield setupForVersion(`[
      "@babel/plugin-transform-modules-amd",
      { noInterop: true },
    ]`);

    this.addon.parent.options = {
      "ember-cli-babel": { useBabelConfig: false },
    };
    input.write({
      "foo.js": `export default {};`,
    });

    subject = this.addon.transpileTree(input.path());
    output = createBuilder(subject);

    yield output.build();

    expect(output.read()).to.deep.equal({
      "foo.js":
        'define("foo", ["exports"], function (_exports) {\n  "use strict";\n\n  Object.defineProperty(_exports, "__esModule", {\n    value: true\n  });\n  _exports.default = void 0;\n  var _default = {};\n  _exports.default = _default;\n});',
    });
  }));
});

function leftPad(str, num) {
  while (num-- > 0) {
    str = ` ${str}`;
  }
  return str;
}
function assembleLines(lines, indent = 2) {
  return lines.map(l => leftPad(l, indent)).join('\n');
}
