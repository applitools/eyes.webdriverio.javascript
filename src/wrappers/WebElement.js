'use strict';


const command = require('../services/selenium/Command');

/**
 * Wrapper for Webdriverio element
 */

class WebElement {

  /**
   * @param {WebDriver} driver
   * @param {Object} element WebElement JSON object
   */
  constructor(driver, element) {
    this._driver = driver;
    this._element = element;
  }


  /**
   * @param {WebDriver} driver
   * @param {By} locator
   * @return {WebElement}
   */
  static async findElement(driver, locator) {
    const {value: element} = await driver.remoteWebDriver.element(locator.value);
    return new WebElement(driver, element);
  }


  /**
   *
   */
  findElements(locator) {

  }


  /**
   * @returns {Promise.<{x, y}>}
   */
  async getLocation() {
    const {value: location} = await this._driver.remoteWebDriver.elementIdLocation(this._element.ELEMENT);
    return location;
  }


  /**
   * @returns {Promise.<width, height>}
   */
  async getSize() {
    const {value: size} = await this._driver.remoteWebDriver.elementIdSize(this._element.ELEMENT);
    return size;
  }


  /**
   * @returns {Promise}
   */
  click() {
    return this._driver.remoteWebDriver.elementIdClick(this._element.ELEMENT);
  }


  /**
   *
   */
  takeScreenshot(opt_scroll) { // todo
    return this._driver.screenshot(opt_scroll);

    // return this.requestHandler.create(`/session/:sessionId/element/${id}/screenshot`);
  }


  static async equals(a, b) {
    if (a === b) {
      return true;
    }

    if (a == undefined || b == undefined) {
      return false;
    }

    const elementA = a.getWebElement().element.ELEMENT;
    const elementB = b.getWebElement().element.ELEMENT;
    if (a === b) {
      return true;
    }

    let cmd = new command.Command(command.Name.ELEMENT_EQUALS);
    cmd.setParameter('id', elementA);
    cmd.setParameter('other', elementB);

    const {value} = await a._driver.executeCommand(cmd);
    return value;
  }


  /**
   * @returns {EyesWebDriver}
   */
  getDriver() {
    return this._driver;
  }

  get element() {
    return this._element;
  }

}

module.exports = WebElement;
