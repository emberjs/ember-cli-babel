# Changelog


## v6.9.0 (2017-11-08)

#### :rocket: Enhancement
* [#176](https://github.com/babel/ember-cli-babel/pull/176) Blacklists `@ember/string` if dependency is present. ([@locks](https://github.com/locks))

#### :memo: Documentation
* [#185](https://github.com/babel/ember-cli-babel/pull/185) Add CHANGELOG file. ([@Turbo87](https://github.com/Turbo87))

#### Committers: 3
- Alvin Crespo ([alvincrespo](https://github.com/alvincrespo))
- Ricardo Mendes ([locks](https://github.com/locks))
- Tobias Bieniek ([Turbo87](https://github.com/Turbo87))

## v6.8.2 (2017-08-30)

#### :bug: Bug Fix
* [#180](https://github.com/babel/ember-cli-babel/pull/180) Update "babel-plugin-ember-modules-api-polyfill" to v2.0.1. ([@Turbo87](https://github.com/Turbo87))

#### Committers: 1
- Tobias Bieniek ([Turbo87](https://github.com/Turbo87))


## v6.8.0 (2017-08-15)

#### :bug: Bug Fix
* [#177](https://github.com/babel/ember-cli-babel/pull/177) Update minimum version of babel-plugin-ember-modules-api-polyfill.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v6.7.2 (2017-08-07)

#### :rocket: Enhancement
* [#175](https://github.com/babel/ember-cli-babel/pull/175) Update `amd-name-resolver` version to enable parallel babel transpile. ([@mikrostew](https://github.com/mikrostew))

#### :house: Internal
* [#173](https://github.com/babel/ember-cli-babel/pull/173) CI: Deploy tags automatically. ([@Turbo87](https://github.com/Turbo87))

#### Committers: 2
- Michael Stewart ([mikrostew](https://github.com/mikrostew))
- Tobias Bieniek ([Turbo87](https://github.com/Turbo87))


## v6.7.1 (2017-08-02)

#### :house: Internal
* [#174](https://github.com/babel/ember-cli-babel/pull/174) update broccoli-babel-transpiler dependency to 6.1.2. ([@mikrostew](https://github.com/mikrostew))

#### Committers: 1
- Michael Stewart ([mikrostew](https://github.com/mikrostew))


## v6.7.0 (2017-08-02)

#### :rocket: Enhancement
* [#172](https://github.com/babel/ember-cli-babel/pull/172) Update "broccoli-babel-transpiler" to v6.1.1. ([@Turbo87](https://github.com/Turbo87))

#### :memo: Documentation
* [#165](https://github.com/babel/ember-cli-babel/pull/165) Include examples for where to put options. ([@dfreeman](https://github.com/dfreeman))

#### :house: Internal
* [#164](https://github.com/babel/ember-cli-babel/pull/164) Improve acceptance tests and Ember syntax. ([@villander](https://github.com/villander))
* [#167](https://github.com/babel/ember-cli-babel/pull/167) ember-cli 2.14.0 upgrade + eslint. ([@kellyselden](https://github.com/kellyselden))
* [#163](https://github.com/babel/ember-cli-babel/pull/163) Removes the flag MODEL_FACTORY_INJECTIONS. ([@villander](https://github.com/villander))

#### Committers: 4
- Dan Freeman ([dfreeman](https://github.com/dfreeman))
- Kelly Selden ([kellyselden](https://github.com/kellyselden))
- Michael Villander ([villander](https://github.com/villander))
- Tobias Bieniek ([Turbo87](https://github.com/Turbo87))


## v6.6.0 (2017-07-06)

#### :bug: Bug Fix
* [#161](https://github.com/babel/ember-cli-babel/pull/161) Avoid conflicting transforms for @ember/debug.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v6.5.0 (2017-07-03)

#### :rocket: Enhancement
* [#159](https://github.com/babel/ember-cli-babel/pull/159) Add emberjs/rfcs#176 support by default.. ([@rwjblue](https://github.com/rwjblue))

#### :house: Internal
* [#155](https://github.com/babel/ember-cli-babel/pull/155) only support supported versions of node. ([@stefanpenner](https://github.com/stefanpenner))

#### Committers: 2
- Robert Jackson ([rwjblue](https://github.com/rwjblue))
- Stefan Penner ([stefanpenner](https://github.com/stefanpenner))


## v6.4.2 (2017-07-02)

#### :rocket: Enhancement
* [#158](https://github.com/babel/ember-cli-babel/pull/158) Respect babel sourceMaps option. ([@dwickern](https://github.com/dwickern))

#### :memo: Documentation
* [#157](https://github.com/babel/ember-cli-babel/pull/157) Add info on adding custom plugins.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 2
- Derek Wickern ([dwickern](https://github.com/dwickern))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v6.4.1 (2017-06-01)

#### :rocket: Enhancement
* [#154](https://github.com/babel/ember-cli-babel/pull/154) Misc Updates. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v6.4.0 (2017-06-01)

#### :house: Internal
* [#145](https://github.com/babel/ember-cli-babel/pull/145) Disable loading configuration from `.babelrc`.. ([@aheuermann](https://github.com/aheuermann))
* [#152](https://github.com/babel/ember-cli-babel/pull/152) [Closes [#150](https://github.com/babel/ember-cli-babel/issues/150)] update babel-preset-env. ([@stefanpenner](https://github.com/stefanpenner))

#### Committers: 2
- Andrew Heuermann ([aheuermann](https://github.com/aheuermann))
- Stefan Penner ([stefanpenner](https://github.com/stefanpenner))


## v6.2.0 (2017-05-31)

#### :rocket: Enhancement
* [#148](https://github.com/babel/ember-cli-babel/pull/148) Add node 8 support. ([@stefanpenner](https://github.com/stefanpenner))

#### :memo: Documentation
* [#139](https://github.com/babel/ember-cli-babel/pull/139) Specifically call out the `@glimmer/env` import path.. ([@rwjblue](https://github.com/rwjblue))
* [#138](https://github.com/babel/ember-cli-babel/pull/138) README: Add missing return type. ([@Turbo87](https://github.com/Turbo87))

#### :house: Internal
* [#144](https://github.com/babel/ember-cli-babel/pull/144) upgrade all the deps. ([@stefanpenner](https://github.com/stefanpenner))

#### Committers: 3
- Robert Jackson ([rwjblue](https://github.com/rwjblue))
- Stefan Penner ([stefanpenner](https://github.com/stefanpenner))
- Tobias Bieniek ([Turbo87](https://github.com/Turbo87))


## v6.1.0 (2017-04-28)

#### :rocket: Enhancement
* [#133](https://github.com/babel/ember-cli-babel/pull/133) Add debug tooling babel plugins.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v6.0.0 (2017-04-22)

#### :boom: Breaking Change
* [#115](https://github.com/babel/ember-cli-babel/pull/115) Babel 6. ([@rwjblue](https://github.com/rwjblue))

#### :rocket: Enhancement
* [#131](https://github.com/babel/ember-cli-babel/pull/131) Expose addon powerz. ([@stefanpenner](https://github.com/stefanpenner))
* [#126](https://github.com/babel/ember-cli-babel/pull/126) Expose a public mechanism to transpile a tree.. ([@rwjblue](https://github.com/rwjblue))
* [#121](https://github.com/babel/ember-cli-babel/pull/121) Allow babel options to be passed through to babel-preset-env.. ([@rwjblue](https://github.com/rwjblue))
* [#120](https://github.com/babel/ember-cli-babel/pull/120) Expose `postTransformPlugins` to be positioned after `preset-env` plugins.. ([@rwjblue](https://github.com/rwjblue))
* [#115](https://github.com/babel/ember-cli-babel/pull/115) Babel 6. ([@rwjblue](https://github.com/rwjblue))

#### :bug: Bug Fix
* [#132](https://github.com/babel/ember-cli-babel/pull/132) Remove debugging console.log statement in index.js. ([@pgrippi](https://github.com/pgrippi))
* [#125](https://github.com/babel/ember-cli-babel/pull/125) Fix clobbering behavior with babel vs babel6 config.. ([@rwjblue](https://github.com/rwjblue))
* [#123](https://github.com/babel/ember-cli-babel/pull/123) Only pass provided options to babel-preset-env.. ([@rwjblue](https://github.com/rwjblue))
* [#122](https://github.com/babel/ember-cli-babel/pull/122) Properly forward the browsers targets to ember-preset-env. ([@kanongil](https://github.com/kanongil))
* [#117](https://github.com/babel/ember-cli-babel/pull/117) Fix issues with isPluginRequired.. ([@rwjblue](https://github.com/rwjblue))

#### :memo: Documentation
* [#128](https://github.com/babel/ember-cli-babel/pull/128) First pass at README updates for 6.. ([@rwjblue](https://github.com/rwjblue))
* [#118](https://github.com/babel/ember-cli-babel/pull/118) Add code snippet for enabling polyfill. ([@li-xinyang](https://github.com/li-xinyang))
* [#113](https://github.com/babel/ember-cli-babel/pull/113) Update README.md. ([@marpo60](https://github.com/marpo60))

#### :house: Internal
* [#124](https://github.com/babel/ember-cli-babel/pull/124) Add basic sanity test to confirm babel-preset-env is working.. ([@rwjblue](https://github.com/rwjblue))
* [#116](https://github.com/babel/ember-cli-babel/pull/116) Remove temporary fork after babel release. ([@cibernox](https://github.com/cibernox))

#### Committers: 7
- Gil Pedersen ([kanongil](https://github.com/kanongil))
- Marcelo Dominguez ([marpo60](https://github.com/marpo60))
- Miguel Camba ([cibernox](https://github.com/cibernox))
- Peter Grippi ([pgrippi](https://github.com/pgrippi))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))
- Stefan Penner ([stefanpenner](https://github.com/stefanpenner))
- Xinyang Li ([li-xinyang](https://github.com/li-xinyang))


## v6.0.0-beta.11 (2017-04-20)

#### :bug: Bug Fix
* [#132](https://github.com/babel/ember-cli-babel/pull/132) Remove debugging console.log statement in index.js. ([@pgrippi](https://github.com/pgrippi))

#### Committers: 1
- Peter Grippi ([pgrippi](https://github.com/pgrippi))


## v6.0.0-beta.10 (2017-04-19)

#### :rocket: Enhancement
* [#131](https://github.com/babel/ember-cli-babel/pull/131) Expose addon powerz. ([@stefanpenner](https://github.com/stefanpenner))

#### :memo: Documentation
* [#128](https://github.com/babel/ember-cli-babel/pull/128) First pass at README updates for 6.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 2
- Robert Jackson ([rwjblue](https://github.com/rwjblue))
- Stefan Penner ([stefanpenner](https://github.com/stefanpenner))


## v6.0.0-beta.9 (2017-03-22)

#### :rocket: Enhancement
* [#126](https://github.com/babel/ember-cli-babel/pull/126) Expose a public mechanism to transpile a tree.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v6.0.0-beta.8 (2017-03-21)

#### :bug: Bug Fix
* [#125](https://github.com/babel/ember-cli-babel/pull/125) Fix clobbering behavior with babel vs babel6 config.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v6.0.0-beta.7 (2017-03-21)

#### :bug: Bug Fix
* [#123](https://github.com/babel/ember-cli-babel/pull/123) Only pass provided options to babel-preset-env.. ([@rwjblue](https://github.com/rwjblue))
* [#122](https://github.com/babel/ember-cli-babel/pull/122) Properly forward the browsers targets to ember-preset-env. ([@kanongil](https://github.com/kanongil))

#### :house: Internal
* [#124](https://github.com/babel/ember-cli-babel/pull/124) Add basic sanity test to confirm babel-preset-env is working.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 2
- Gil Pedersen ([kanongil](https://github.com/kanongil))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v6.0.0-beta.6 (2017-03-20)

#### :rocket: Enhancement
* [#121](https://github.com/babel/ember-cli-babel/pull/121) Allow babel options to be passed through to babel-preset-env.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v6.0.0-beta.5 (2017-03-15)

#### :rocket: Enhancement
* [#120](https://github.com/babel/ember-cli-babel/pull/120) Expose `postTransformPlugins` to be positioned after `preset-env` plugins.. ([@rwjblue](https://github.com/rwjblue))

#### :bug: Bug Fix
* [#117](https://github.com/babel/ember-cli-babel/pull/117) Fix issues with isPluginRequired.. ([@rwjblue](https://github.com/rwjblue))

#### :memo: Documentation
* [#118](https://github.com/babel/ember-cli-babel/pull/118) Add code snippet for enabling polyfill. ([@li-xinyang](https://github.com/li-xinyang))

#### Committers: 2
- Robert Jackson ([rwjblue](https://github.com/rwjblue))
- Xinyang Li ([li-xinyang](https://github.com/li-xinyang))


## v6.0.0-beta.3 (2017-03-13)

#### :boom: Breaking Change
* [#115](https://github.com/babel/ember-cli-babel/pull/115) Babel 6. ([@rwjblue](https://github.com/rwjblue))

#### :rocket: Enhancement
* [#115](https://github.com/babel/ember-cli-babel/pull/115) Babel 6. ([@rwjblue](https://github.com/rwjblue))

#### :house: Internal
* [#116](https://github.com/babel/ember-cli-babel/pull/116) Remove temporary fork after babel release. ([@cibernox](https://github.com/cibernox))

#### Committers: 2
- Miguel Camba ([cibernox](https://github.com/cibernox))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v6.0.0-beta.1 (2017-04-20)

#### :rocket: Enhancement
* [#131](https://github.com/babel/ember-cli-babel/pull/131) Expose addon powerz. ([@stefanpenner](https://github.com/stefanpenner))

#### :bug: Bug Fix
* [#132](https://github.com/babel/ember-cli-babel/pull/132) Remove debugging console.log statement in index.js. ([@pgrippi](https://github.com/pgrippi))

#### :memo: Documentation
* [#128](https://github.com/babel/ember-cli-babel/pull/128) First pass at README updates for 6.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 3
- Peter Grippi ([pgrippi](https://github.com/pgrippi))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))
- Stefan Penner ([stefanpenner](https://github.com/stefanpenner))


## v6.0.0-alpha.1 (2017-03-06)

#### :memo: Documentation
* [#113](https://github.com/babel/ember-cli-babel/pull/113) Update README.md. ([@marpo60](https://github.com/marpo60))

#### Committers: 1
- Marcelo Dominguez ([marpo60](https://github.com/marpo60))


## v5.2.4 (2017-02-09)

#### :bug: Bug Fix
* [#111](https://github.com/babel/ember-cli-babel/pull/111) Fix for undefined parent error. ([@hsdwayne](https://github.com/hsdwayne))

#### Committers: 1
- [hsdwayne](https://github.com/hsdwayne)


## v5.2.3 (2017-02-06)

#### :house: Internal
* [#110](https://github.com/babel/ember-cli-babel/pull/110) Update minimum version of broccoli-babel-transpiler.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v5.2.2 (2017-02-04)

#### :memo: Documentation
* [#107](https://github.com/babel/ember-cli-babel/pull/107) `Brocfile.js` -> `ember-cli-build.js`. ([@twokul](https://github.com/twokul))

#### :house: Internal
* [#108](https://github.com/babel/ember-cli-babel/pull/108) Add more detailed annotation.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 2
- Alex Navasardyan ([twokul](https://github.com/twokul))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v5.2.1 (2016-12-07)

#### :bug: Bug Fix
* [#106](https://github.com/babel/ember-cli-babel/pull/106) Fix feature detection bug for setupPreprocessorRegistry.. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1
- Robert Jackson ([rwjblue](https://github.com/rwjblue))


## v5.2.0 (2016-12-07)

#### :rocket: Enhancement
* [#103](https://github.com/babel/ember-cli-babel/pull/103) Add appveyor badge. ([@stefanpenner](https://github.com/stefanpenner))
* [#100](https://github.com/babel/ember-cli-babel/pull/100) Add on example options how to disable some transformations. ([@cibernox](https://github.com/cibernox))

#### :house: Internal
* [#105](https://github.com/babel/ember-cli-babel/pull/105) Move custom options to "ember-cli-babel" options hash. ([@Turbo87](https://github.com/Turbo87))
* [#104](https://github.com/babel/ember-cli-babel/pull/104) Replace deprecated version checker method call. ([@Turbo87](https://github.com/Turbo87))
* [#101](https://github.com/babel/ember-cli-babel/pull/101) package.json cleanup. ([@Turbo87](https://github.com/Turbo87))

#### Committers: 4
- Greenkeeper ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))
- Miguel Camba ([cibernox](https://github.com/cibernox))
- Stefan Penner ([stefanpenner](https://github.com/stefanpenner))
- Tobias Bieniek ([Turbo87](https://github.com/Turbo87))


## v5.1.10 (2016-08-15)

#### :rocket: Enhancement
* [#89](https://github.com/babel/ember-cli-babel/pull/89) Fix issue with app.import being undefined. ([@sandersky](https://github.com/sandersky))

#### Committers: 1
- Matthew Dahl ([sandersky](https://github.com/sandersky))


## v5.1.9 (2016-08-12)

#### :rocket: Enhancement
* [#86](https://github.com/babel/ember-cli-babel/pull/86) Pass console object in to broccoli-babel-transpiler.. ([@rwjblue](https://github.com/rwjblue))
* [#81](https://github.com/babel/ember-cli-babel/pull/81) LazilyRequire broccoli-funnel. ([@stefanpenner](https://github.com/stefanpenner))
* [#78](https://github.com/babel/ember-cli-babel/pull/78) Update "ember-cli" to v1.13.8. ([@Turbo87](https://github.com/Turbo87))

#### :bug: Bug Fix
* [#88](https://github.com/babel/ember-cli-babel/pull/88) Prevent errors with console options under older ember-cli's.. ([@rwjblue](https://github.com/rwjblue))
* [#77](https://github.com/babel/ember-cli-babel/pull/77) Pin jQuery to v1.11.3 to fix builds. ([@Turbo87](https://github.com/Turbo87))

#### :house: Internal
* [#83](https://github.com/babel/ember-cli-babel/pull/83) Adds .npmignore and whitelists js files. ([@twokul](https://github.com/twokul))
* [#79](https://github.com/babel/ember-cli-babel/pull/79) upgrade ember-cli to 2.6.2. ([@stefanpenner](https://github.com/stefanpenner))

#### Committers: 8
- Alex Navasardyan ([twokul](https://github.com/twokul))
- Brian Sipple ([BrianSipple](https://github.com/BrianSipple))
- Greenkeeper ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))
- Kelvin Luck ([vitch](https://github.com/vitch))
- Pat O'Callaghan ([patocallaghan](https://github.com/patocallaghan))
- Robert Jackson ([rwjblue](https://github.com/rwjblue))
- Stefan Penner ([stefanpenner](https://github.com/stefanpenner))
- Tobias Bieniek ([Turbo87](https://github.com/Turbo87))


## v5.1.5 (2015-08-25)

#### :rocket: Enhancement
* [#51](https://github.com/babel/ember-cli-babel/pull/51) Using broccoli-babel-transpiler latest version. ([@msranade](https://github.com/msranade))

#### Committers: 3
- Gordon Kristan ([gordonkristan](https://github.com/gordonkristan))
- Manish Ranade ([msranade](https://github.com/msranade))
- Stefan Penner ([stefanpenner](https://github.com/stefanpenner))


## v5.1.1 (2016-08-15)

#### :rocket: Enhancement
* [#89](https://github.com/babel/ember-cli-babel/pull/89) Fix issue with app.import being undefined. ([@sandersky](https://github.com/sandersky))

#### Committers: 1
- Matthew Dahl ([sandersky](https://github.com/sandersky))
