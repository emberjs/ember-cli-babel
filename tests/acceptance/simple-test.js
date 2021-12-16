import { module, test } from 'qunit';
import { visit } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | ES6 features work correctly', function(hooks) {
  setupApplicationTest(hooks);

  test('visit /', async function(assert) {
    await visit('/');

    assert.equal('Test Value', this.element.querySelector('#test-input').value, 'Has arrow functions and template string as ES6 feature');
    assert.equal('one', this.element.querySelector('#first-value').textContent, 'Has generators as ES6 feature');
    assert.equal('two', this.element.querySelector('#last-value').textContent, 'Has generators as ES6 feature');
    assert.equal('dog', this.element.querySelector('#animal-value').textContent, 'Has class and getters/setters and decorators as ES6 feature');
    assert.equal('mammal', this.element.querySelector('#animal-type').textContent, 'Has class decorators as ES6 feature');
    assert.equal('mammal', this.element.querySelector('#static-animal-type').textContent, 'static and fields as an ES6 class feature');
    assert.equal('123', this.element.querySelector('#uses-decorators').textContent, 'decorated class fields work in the app')
    assert.equal('private field', this.element.querySelector('#gets-private-field').textContent, 'private class fields work in the app')
    assert.equal('private method', this.element.querySelector('#calls-private-method').textContent, 'private methods work in the app')
  });
});
