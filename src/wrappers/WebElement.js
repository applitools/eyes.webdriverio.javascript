'use strict';


/**
 * Wrapper for Webdriverio element
 */

class WebElement {

  /**
   *
   * @param browser
   * @param element
   */
  constructor(browser, element) {
    this._browser = browser;
    this._element = element;
  }


  /**
   * @param {By} locator
   * @return {EyesWebElement}
   */
  findElement(locator) {
    return this._browser.element(locator.value);
  }


  /**
   *
   */
  findElements(locator) {

  }


  /**
   *
   * @returns {Promise.<{x, y}>}
   */
  getLocation() {
    return this._browser.remoteWebDriver.elementIdLocation(this._element.value.ELEMENT);
  }

  getSize() {
    return this._browser.remoteWebDriver.elementIdSize(this._element.value.ELEMENT);
  }


  /**
   *
   */
  takeScreenshot(opt_scroll) {
    return this._browser.screenshot(opt_scroll);

    return this.requestHandler.create(`/session/:sessionId/element/${id}/screenshot`);


  }


  // todo
  equals(a, b) {
    return false;
  }


}

module.exports = WebElement;
