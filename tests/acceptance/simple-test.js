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
