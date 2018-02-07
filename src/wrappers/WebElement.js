'use strict';


const command = require('../services/selenium/Command');

/**
 * Wrapper for Webdriverio element
 */

class WebElement {

  /**
   * @param {EyesWebDriver} driver
   * @param {Object} element WebElement JSON object
   */
  constructor(driver, element) {
    this._driver = driver;
    this._element = element;
  }


  /**
   * @param {By} locator
   * @return {WebElement}
   */
  findElement(locator) {
    const element = this._driver.remoteWebDriver.element(locator.value);
    return new WebElement(this._driver, element);
  }


  /**
   *
   */
  findElements(locator) {

  }


  /**
   * @returns {Promise.<{x, y}>}
   */
  getLocation() {
    return this._driver.remoteWebDriver.elementIdLocation(this._element.ELEMENT);
  }


  /**
   * @returns {Promise}
   */
  getSize() {
    return this._driver.remoteWebDriver.elementIdSize(this._element.ELEMENT);
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
