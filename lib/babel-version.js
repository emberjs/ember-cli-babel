'use strict';

const semver = require("semver");
const resolvePackagePath = require("resolve-package-path");

let _babelMajorVersion;

/**
 * Returns the major version of the installed @babel/core package.
 * The result is cached for the lifetime of the process.
 *
 * @returns {number} The major version (e.g. 7 or 8)
 */
function getBabelMajorVersion() {
  if (_babelMajorVersion !== undefined) return _babelMajorVersion;

  const pkgPath = resolvePackagePath("@babel/core", __dirname);
  if (pkgPath) {
    const pkg = require(pkgPath);
    _babelMajorVersion = semver.major(pkg.version);
  } else {
    _babelMajorVersion = 7;
  }
  return _babelMajorVersion;
}

/**
 * Returns true if @babel/core v8 or higher is installed.
 *
 * @returns {boolean}
 */
function isBabel8() {
  return getBabelMajorVersion() >= 8;
}

/**
 * Reset the cached version (used in tests).
 */
function _resetBabelMajorVersion() {
  _babelMajorVersion = undefined;
}

/**
 * Override the cached Babel major version (used in tests).
 * Pass `undefined` to reset to auto-detection.
 *
 * @param {number|undefined} version
 */
function _overrideBabelMajorVersion(version) {
  _babelMajorVersion = version;
}

module.exports = { getBabelMajorVersion, isBabel8, _resetBabelMajorVersion, _overrideBabelMajorVersion };
