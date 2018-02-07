'use strict';

const TargetLocator = require('../TargetLocator');
const SeleniumService = require('../services/selenium/SeleniumService');


class WebDriver {

  /**
   *
   * @param {Object} remoteWebDriver
   */
  constructor(remoteWebDriver) {
    this._remoteWebDriver = remoteWebDriver;
  }


  /**
   * @param {By} locator
   * @return {WebElement}
   */
  findElement(locator) {
    return this._remoteWebDriver.element(locator.value);
  }


  /**
   * Save a screenshot as a base64 encoded PNG
   * @return {Promise.Buffer} returns base64 string buffer
   */
  async takeScreenshot() {
    return this._remoteWebDriver.saveScreenshot();
  }


  defaultContent() {
    return this._remoteWebDriver.frame();
  }


  switchTo() {
    return new TargetLocator(this);
  }


  frame(id) {
    return this._remoteWebDriver.frame(id);
  }


  sleep(ms) {
    return this._remoteWebDriver.pause(ms);
  }


  quit() {
    return this._remoteWebDriver.end();
  }


  /**
   *
   * @return {Promise}
   */
  execute(f) {
    return this._remoteWebDriver.execute(f);
  }

  get remoteWebDriver() {
    return this._remoteWebDriver;
  }


  getCapabilities() {}


  /**
   * @param {Command} cmd
   * @returns {Promise<void>}
   */
  async executeCommand(cmd) {
    const seleniumService = new SeleniumService(this.remoteWebDriver);
    return seleniumService.execute(cmd);
  }

}

module.exports = WebDriver;
