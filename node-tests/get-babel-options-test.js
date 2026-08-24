const expect = require("chai").expect;
const MockUI = require("console-ui/mock");
const CoreObject = require("core-object");
const AddonMixin = require("../index");
let {
  _addTypeScriptPlugin,
  _getAddonProvidedConfig,
  _addDecoratorPlugins,
  _getHelpersPlugin,
  _getPresetEnv,
  _getModulesPlugin,
} = require("../lib/babel-options-util");
const { _overrideBabelMajorVersion } = require("../lib/babel-version");

let Addon = CoreObject.extend(AddonMixin);

describe("get-babel-options", function () {
  const ORIGINAL_EMBER_ENV = process.env.EMBER_ENV;

  beforeEach(function () {
    this.ui = new MockUI();
    let project = {
      isEmberCLIProject: () => true,
      _addonsInitialized: true,
      root: __dirname,
      emberCLIVersion: () => "2.16.2",
      dependencies() {
        return {};
      },
      addons: [],
      targets: {
        browsers: ["ie 11"],
      },
    };

    this.addon = new Addon({
      project,
      parent: project,
      ui: this.ui,
    });

    project.addons.push(this.addon);
  });

  afterEach(function () {
    if (ORIGINAL_EMBER_ENV === undefined) {
      delete process.env.EMBER_ENV;
    } else {
      process.env.EMBER_ENV = ORIGINAL_EMBER_ENV;
    }
  });
  describe("_addTypeScriptPlugin", function () {
    it("should warn and not add the TypeScript plugin if already added", function () {
      this.addon.project.ui = {
        writeWarnLine(message) {
          expect(message).to.match(
            /has added the TypeScript transform plugin to its build/
          );
        },
      };

      expect(
        _addTypeScriptPlugin(
          [["@babel/plugin-transform-typescript"]],
          {},
          this.addon.parent,
          this.addon.project
        ).length
      ).to.equal(1, "plugin was not added");
    });
  });

  describe("_addDecoratorPlugins", function () {
    it("should include babel transforms by default", function () {
      expect(
        _addDecoratorPlugins([], {}, {}, this.addon.parent, this.addon.project)
          .length
      ).to.equal(5, "plugins added correctly");
    });

    it("should include only fields if it detects decorators plugin", function () {
      this.addon.project.ui = {
        writeWarnLine(message) {
          expect(message).to.match(
            /has added the decorators plugin to its build/
          );
        },
      };

      expect(
        _addDecoratorPlugins(
          [["@babel/plugin-proposal-decorators"]],
          {},
          {},
          this.addon.parent,
          this.addon.project
        ).length
      ).to.equal(5, "plugins were not added");
    });

    it("should include only decorators if it detects class fields plugin", function () {
      this.addon.project.ui = {
        writeWarnLine(message) {
          expect(message).to.match(
            /has added the class-properties plugin to its build/
          );
        },
      };

      expect(
        _addDecoratorPlugins(
          [["@babel/plugin-transform-class-properties"]],
          {},
          {},
          this.addon.parent,
          this.addon.project
        ).length
      ).to.equal(3, "plugins were not added");
    });

    it("should use babel options loose mode for class properties", function () {
      let strictPlugins = _addDecoratorPlugins(
        [],
        {},
        {},
        this.addon.parent,
        this.addon.project
      );

      expect(strictPlugins[strictPlugins.length - 1][1].loose).to.equal(
        false,
        "loose is false if no option is provided"
      );

      let loosePlugins = _addDecoratorPlugins(
        [],
        { loose: true },
        {},
        this.addon.parent,
        this.addon.project
      );

      expect(loosePlugins[loosePlugins.length - 1][1].loose).to.equal(
        true,
        "loose setting added correctly"
      );
    });

    it("should include class fields and decorators after typescript if handling typescript", function () {
      const config = {
        "ember-cli-babel": { enableTypeScriptTransform: true },
      };
      let plugins = _addDecoratorPlugins(
        ["@babel/plugin-transform-typescript"],
        {},
        config,
        this.addon.parent,
        this.addon.project
      );
      expect(plugins[0]).to.equal(
        "@babel/plugin-transform-typescript",
        "typescript still first"
      );
      expect(plugins.length).to.equal(6, "class fields and decorators added");
    });

    it("should include class fields and decorators before typescript if not handling typescript", function () {
      const config = {
        "ember-cli-babel": { enableTypeScriptTransform: false },
      };
      let plugins = _addDecoratorPlugins(
        ["@babel/plugin-transform-typescript"],
        {},
        config,
        this.addon.parent,
        this.addon.project
      );

      expect(plugins.length).to.equal(6, "class fields and decorators added");
      expect(plugins[5]).to.equal(
        "@babel/plugin-transform-typescript",
        "typescript is now last"
      );
    });
  });

  describe("_getAddonProvidedConfig", function () {
    it("does not mutate addonOptions.babel", function () {
      let babelOptions = { blah: true };
      this.addon.parent = {
        dependencies() {
          return {};
        },
        options: {
          babel: babelOptions,
        },
      };

      let result = _getAddonProvidedConfig(this.addon._getAddonOptions());
      expect(result.options).to.not.equal(babelOptions);
    });
  });

  describe("Babel 8 compatibility", function () {
    afterEach(function () {
      _overrideBabelMajorVersion(undefined);
    });

    describe("_addDecoratorPlugins (Babel 8)", function () {
      it("should use version:'legacy' instead of legacy:true for decorators", function () {
        _overrideBabelMajorVersion(8);

        let plugins = _addDecoratorPlugins(
          [],
          {},
          {},
          this.addon.parent,
          this.addon.project
        );

        let decoratorPlugin = plugins.find(
          (p) => Array.isArray(p) && String(p[0]).includes("plugin-proposal-decorators")
        );

        expect(decoratorPlugin).to.exist;
        expect(decoratorPlugin[1]).to.deep.equal({ version: "legacy" });
        expect(decoratorPlugin[1]).to.not.have.property("legacy");
      });

      it("should not pass legacy:true to static-block plugin", function () {
        _overrideBabelMajorVersion(8);

        let plugins = _addDecoratorPlugins(
          [],
          {},
          {},
          this.addon.parent,
          this.addon.project
        );

        let staticBlockPlugin = plugins.find(
          (p) => Array.isArray(p) && String(p[0]).includes("plugin-transform-class-static-block")
        );

        expect(staticBlockPlugin).to.exist;
        expect(staticBlockPlugin[1]).to.deep.equal({});
      });
    });

    describe("_addTypeScriptPlugin (Babel 8)", function () {
      it("should not pass allowDeclareFields option", function () {
        _overrideBabelMajorVersion(8);

        let plugins = _addTypeScriptPlugin(
          [],
          this.addon.parent,
          this.addon.project
        );

        let tsPlugin = plugins.find(
          (p) => Array.isArray(p) && String(p[0]).includes("plugin-transform-typescript")
        );

        expect(tsPlugin).to.exist;
        expect(tsPlugin[1]).to.deep.equal({});
        expect(tsPlugin[1]).to.not.have.property("allowDeclareFields");
      });
    });

    describe("_getHelpersPlugin (Babel 8)", function () {
      it("should not include useESModules option", function () {
        _overrideBabelMajorVersion(8);

        let project = this.addon.project;
        let result = _getHelpersPlugin(project);

        expect(result).to.have.lengthOf(1);
        let pluginOptions = result[0][1];
        expect(pluginOptions).to.not.have.property("useESModules");
        expect(pluginOptions).to.have.property("regenerator", false);
      });
    });

    describe("_getPresetEnv (Babel 8)", function () {
      it("should strip loose and spec options", function () {
        _overrideBabelMajorVersion(8);

        let project = {
          targets: { browsers: ["last 2 versions"] },
        };
        let config = {
          options: {
            loose: true,
            spec: true,
          },
        };

        let result = _getPresetEnv(config, project);

        expect(result[1]).to.not.have.property("loose");
        expect(result[1]).to.not.have.property("spec");
        expect(result[1]).to.have.property("modules", false);
      });
    });

    describe("_getModulesPlugin (Babel 8)", function () {
      it("should include moduleIds and getModuleId in AMD plugin options", function () {
        _overrideBabelMajorVersion(8);

        let result = _getModulesPlugin();

        expect(result).to.have.lengthOf(2);

        let amdPlugin = result[1];
        expect(amdPlugin[1]).to.have.property("noInterop", true);
        expect(amdPlugin[1]).to.have.property("moduleIds", true);
        expect(amdPlugin[1]).to.have.property("getModuleId");
        expect(amdPlugin[1].getModuleId).to.be.a("function");
      });
    });

    describe("_addDecoratorPlugins (Babel 7 still works)", function () {
      it("should use legacy:true for decorators in Babel 7", function () {
        _overrideBabelMajorVersion(7);

        let plugins = _addDecoratorPlugins(
          [],
          {},
          {},
          this.addon.parent,
          this.addon.project
        );

        let decoratorPlugin = plugins.find(
          (p) => Array.isArray(p) && String(p[0]).includes("plugin-proposal-decorators")
        );

        expect(decoratorPlugin).to.exist;
        expect(decoratorPlugin[1]).to.deep.equal({ legacy: true });
      });
    });
  });
});
