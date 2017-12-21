'use strict';


class TargetLocator {


  /**
   * @param {WebDriver} driver
   */
  constructor(driver) {
    this._driver = driver;
  }


  defaultContent() {
    return this._driver.remoteWebDriver.frame();
  }


  frame(id) {
    return this._driver.frame(id);
  }


  /**
   *
   */
  alert() {
    // todo
  }

}

module.exports = TargetLocator;
