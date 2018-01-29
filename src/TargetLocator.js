'use strict';


class TargetLocator {


  /**
   * @param {WebDriver} driver
   */
  constructor(driver) {
    this._tsInstance = driver;
  }


  defaultContent() {
    return this._tsInstance.remoteWebDriver.frame();
  }


  frame(id) {
    return this._tsInstance.remoteWebDriver.frame(id);
  }


  /**
   *
   */
  alert() {
    // todo
  }

}

module.exports = TargetLocator;
