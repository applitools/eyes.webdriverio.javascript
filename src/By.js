const {By: ByBase} = require('selenium-webdriver');


class By extends ByBase {

  /**
   *
   * @param {String} using
   * @param {String} value
   */
  constructor(using, value) {
    super(using, value);
  }

  static name(name) {
    return super.name(name);
  }
}

exports.By = By;
