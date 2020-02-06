'use strict';

const TargetLocator = require('../TargetLocator');
const WebElement = require('../wrappers/WebElement');
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
    return this.remoteWebDriver.element(locator.value).then(r => {
      const {value: element} = r;
      return new WebElement(this, element, locator);
    });
  }


  /**
   * Save a screenshot as a base64 encoded PNG
   * @return {Promise.Buffer} returns base64 string buffer
   */
  takeScreenshot() {
    return this.remoteWebDriver.saveScreenshot();
  }


  defaultContent() {
    return this.remoteWebDriver.frame();
  }


  switchTo() {
    return new TargetLocator(this);
  }


  frame(id) {
    return this.remoteWebDriver.frame(id);
  }


  sleep(ms) {
    return this.remoteWebDriver.pause(ms);
  }


  end() {
    return this.remoteWebDriver.end();
  }


  url(url) {
    return this.remoteWebDriver.url(url);
  }


  getUrl() {
    return this.remoteWebDriver.getUrl();
  }

  getTitle() {
    return this.remoteWebDriver.getTitle();
  }

  close() {
    return this.remoteWebDriver.close();
  }

  windowHandle() {
    return this.remoteWebDriver.windowHandle();
  }

  getSource() {
    return this.remoteWebDriver.getSource();
  }

  /**
   * @return {Promise}
   */
  async execute(f) {
    try {
      const result = await this.remoteWebDriver.execute(f);
      return result.value;
    } catch (e) {
      throw e;
    }
  }

  /**
   * @return {Promise}
   */
  async executeAsync(f) {
    try {
      const result = await this.remoteWebDriver.executeAsync(f);
      return result.value;
    } catch (e) {
      throw e;
    }
  }

  get remoteWebDriver() {
    return this._remoteWebDriver;
  }

  getCapabilities() {
    return this.remoteWebDriver.getCapabilities();
  }

  /**
   * @param {Command} cmd
   * @returns {Promise<void>}
   */
  executeCommand(cmd) {
    const seleniumService = new SeleniumService(this.remoteWebDriver);
    return seleniumService.execute(cmd);
  }

}

module.exports = WebDriver;
