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
   * @return {EyesWebElement}
   */
  findElement(locator) {
    return this._driver.element(locator.value);
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
  equals(a, b) {
    return false;
  }


  get element() {
    return this._element;
  }

}

module.exports = WebElement;
