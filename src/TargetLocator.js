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



}

module.exports = TargetLocator;
