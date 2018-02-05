'use strict';


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


  // todo
  static equals(a, b) {
    if (a === b) {
      return a._driver.getPromiseFactory().resolve(true);
    }

    return false;
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
