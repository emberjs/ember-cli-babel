import Ember from 'ember';
import { module, test } from 'qunit';
import startApp from '../helpers/start-app';

let App;

module('Simple Acceptance Test', {
  beforeEach() {
    App = startApp();
  },

  afterEach() {
    Ember.run(App, 'destroy');
  }
});

test('value of input', function(assert) {
  visit('/');

  andThen(() => {
    assert.equal('Test Value', find('#test-input').val());
    assert.equal('one', find('#first-value').text());
    assert.equal('two', find('#last-value').text());
  });
});

test('ember-cli-htmlbars-inline-precompile is looked up from the registry', function(assert) {
  // the ember-cli-htmlbars-inline-precompile-mock in-repo-addon registers a
  // whitelisted plugin, which replaces a "my template" string with
  // "precompiled"
  assert.equal("my template", "precompiled");
});

test('babel-plugin is looked up from the registry', function(assert) {
  // Altough there is a babel-plugin registered which would replace the string
  // below with 42, the string is not replaced, since currently only specific
  // babel-plugins are whitelisted. See
  // https://github.com/babel/ember-cli-babel/pull/42 for context.
  assert.notEqual('THE-answer', 42);
});
