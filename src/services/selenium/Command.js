'use strict';


class Command {

  constructor(name) {
    /** @private {string} */
    this._name = name;

    /** @private {!Object<*>} */
    this._parameters = {};
  }


  setParameter(name, value) {
    this._parameters[name] = value;
    return this;
  }

  setParameters(parameters) {
    this._parameters = parameters;
    return this;
  }

  getParameter(key) {
    return this._parameters[key];
  }

  getParameters() {
    return this._parameters;
  }


  getName() {
    return this._name;
  }

}


const Name = {
  ELEMENT_EQUALS: 'elementEquals'
};





module.exports = {
  Command: Command,
  Name: Name
};
