'use strict';


class TargetLocator {


  /**
   * @param {WebDriver} driver
   */
  constructor(driver) {
    this._tsInstance = driver;
  }


  defaultContent() {
    return this._tsInstance.remoteWebDriver.switchToFrame(null);
  }


  frame(id) {
    return this._tsInstance.remoteWebDriver.switchToFrame(id);
  }


  /**
   *
   */
  alert() {
    // todo
  }

}

module.exports = TargetLocator;
