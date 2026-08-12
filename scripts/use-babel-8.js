'use strict';

/*
 * Rewrites package.json so the test suite installs against Babel 8.
 *
 * ember-cli-babel supports Babel 7 and 8 from one codebase, but a checkout can
 * only have one of them installed at a time. CI runs the node tests twice: once
 * as-is, and once after this script.
 *
 * Two of these overrides are workarounds rather than statements about what
 * ember-cli-babel needs:
 *
 *   - `code-equality-assertions` depends on @babel/core ^7 and calls `transform`
 *     synchronously, which Babel 8 made callback-only. It is a test-time
 *     assertion helper, so it is pinned to its own Babel 7 copy.
 *   - `broccoli-babel-transpiler` still declares `@babel/core: ^7.17.9` as a
 *     peer. Its actual API usage (`transformAsync`) works fine on Babel 8, so
 *     the peer check is relaxed here. Babel 8 support cannot ship until that
 *     range is widened upstream.
 */

const fs = require('fs');
const path = require('path');

const BABEL_8 = '^8.0.0';

const PACKAGES = [
  '@babel/core',
  '@babel/helper-compilation-targets',
  '@babel/plugin-proposal-decorators',
  '@babel/plugin-transform-class-properties',
  '@babel/plugin-transform-class-static-block',
  '@babel/plugin-transform-modules-amd',
  '@babel/plugin-transform-private-methods',
  '@babel/plugin-transform-private-property-in-object',
  '@babel/plugin-transform-runtime',
  '@babel/plugin-transform-typescript',
  '@babel/preset-env',
  '@babel/runtime',
];

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const overrides = Object.fromEntries(PACKAGES.map((name) => [name, BABEL_8]));
overrides['code-equality-assertions>@babel/core'] = '^7.19.6';

pkg.devDependencies['@babel/core'] = BABEL_8;
pkg.pnpm = Object.assign({}, pkg.pnpm, {
  overrides: Object.assign({}, pkg.pnpm && pkg.pnpm.overrides, overrides),
  peerDependencyRules: { allowAny: ['@babel/core'] },
});

fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log('package.json pinned to Babel 8. Run `pnpm install --no-frozen-lockfile`.');
