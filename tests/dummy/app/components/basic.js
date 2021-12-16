import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

export default class Basic extends Component {
  @tracked someField = 123;

  #privateField = "private field";

  #privateMethod() {
    return "private method";
  }

  get getsPrivateField() {
    return this.#privateField;
  }

  get callsPrivateMethod() {
    return this.#privateMethod();
  }
}
