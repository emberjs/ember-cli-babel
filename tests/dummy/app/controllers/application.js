/* eslint-disable ember/no-computed-properties-in-native-classes */

import { set } from '@ember/object';
import Controller from '@ember/controller';
import { computed } from '@ember/object';
import { A } from '@ember/array';
import Animal from 'dummy/utils/class-animal';

export default class ApplicationController extends Controller {
  constructor() {
    super(...arguments);

    set(this, 'animal', new Animal('dog'));
  }

  @computed('animal.name', {
    get() {
      return this.animal.name;
    },
  })
  animalName;

  @computed({
    get() {
      return Animal.type;
    },
  })
  staticAnimalType;

  // Just a very roundabout way of using some ES6 features
  value = ((test = 'Test') => `${test} ${'Value'}`)();

  // Test a generator (needs the regenerator runtime) and some ES6 constructs (requires the corejs polyfill)
  values = A(
    Array.from({
      *[Symbol.iterator]() {
        yield 'one';
        yield 'two';
      },
    })
  )
}
