'use strict';

/*
 * `@babel/runtime` >= 7.13 publishes its ESM helpers with explicit `.js`
 * extensions on their relative imports (e.g. `import x from "./x.js"`).
 * The AMD modules we define for these helpers use extensionless names, so
 * the extension must be stripped for the imports to resolve at runtime.
 * See: https://github.com/emberjs/ember-cli-babel/issues/384
 */
module.exports = function stripRelativeImportExtensions() {
  const rewrite = (path) => {
    const source = path.node.source;
    if (source && source.value.startsWith('.') && source.value.endsWith('.js')) {
      source.value = source.value.slice(0, -3);
    }
  };

  return {
    name: 'strip-relative-import-extensions',
    visitor: {
      // the rewrite must happen in `Program.enter` because
      // babel-plugin-module-resolver resolves import paths in its own
      // `Program` visitor, before individual declaration visitors run
      Program: {
        enter(programPath) {
          programPath.traverse({
            'ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration': rewrite,
          });
        },
      },
    },
  };
};
