'use strict';

const TargetLocator = require('../TargetLocator');

class WebDriver {

  /**
   *
   * @param {Object} remoteWebDriver
   */
  constructor(remoteWebDriver) {
    this._remoteWebDriver = remoteWebDriver;
  }


  defaultContent() {
    return this._remoteWebDriver.frame();
  }


  switchTo() {
    return new TargetLocator(this);
  }


  get remoteWebDriver() {
    return this._remoteWebDriver;
  }



}

module.exports = WebDriver;
