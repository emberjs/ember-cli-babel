class Animal {
  constructor(name) {
    this._name = name
  }

  get name() {
    return this._name
  }

  set name(name) {
    this._name = name
  }
}

export default Animal;
