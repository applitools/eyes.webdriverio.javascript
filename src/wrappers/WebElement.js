'use strict';


const command = require('../services/selenium/Command');
const EyesWebElement = require('./EyesWebElement');

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
  static findElement(driver, locator) {
    return driver.remoteWebDriver.element(locator.value).then(r => {
      const {value: element} = r;
      return new WebElement(driver, element);
    });
  }


  /**
   *
   */
  findElements(locator) {

  }


  /**
   * @deprecated
   * @returns {Promise.<{x, y}>}
   */
  getLocation() {
    return this._driver.remoteWebDriver.elementIdLocation(this._element.ELEMENT).then(r => {
      const {value: location} = r;
      return location;
    });
  }


  /**
   * @deprecated
   * @returns {Promise.<width, height>}
   */
  getSize() {
    return this._driver.remoteWebDriver.elementIdSize(this._element.ELEMENT).then(r => {
      const {value: size} = r;
      return size;
    });
  }


  /**
   * @returns {Promise.<x, y, width, height>}
   */
  getRect() {
    return this._driver.remoteWebDriver.elementIdRect(this._element.ELEMENT).then(r => { // todo need to replace elementIdSize to elementIdRect
      const {value: rect} = r;
      return rect;
    });
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


  static equals(a, b) {
    if (a == undefined || b == undefined) {
      return false;
    }

    if (!(a instanceof this) || !(b instanceof this)) {
      return false;
    }

    if (a === b) {
      return true;
    }

    const elementA = a.getWebElement().element.ELEMENT;
    const elementB = b.getWebElement().element.ELEMENT;
    if (a === b) {
      return true;
    }

    let cmd = new command.Command(command.Name.ELEMENT_EQUALS);
    cmd.setParameter('id', elementA);
    cmd.setParameter('other', elementB);

    return a._driver.executeCommand(cmd).then(r => {
      const {value} = r;
      return value;
    }).catch(e => {
      throw e;
    });
  }


  /**
   * @param keysToSend
   * @returns {Promise}
   */
  sendKeys(keysToSend) {
    const that = this;
    return that._driver.remoteWebDriver.elementIdClick(this._element.ELEMENT).then(() => {
      return that._driver.remoteWebDriver.keys(keysToSend);
    });
  }

  /**
   * @returns {Promise.<{offsetLeft, offsetTop}>}
   */
  getElementOffset() {
    const that = this;
    let offsetLeft;
    return that._driver.remoteWebDriver.elementIdAttribute(this._element.ELEMENT, 'offsetLeft').then(offsetLeft_ => {
      offsetLeft = offsetLeft_.value;
      return that._driver.remoteWebDriver.elementIdAttribute(this._element.ELEMENT, 'offsetTop');
    }).then(offsetTop_ => {
      return {offsetLeft: parseInt(offsetLeft), offsetTop: parseInt(offsetTop_.value)}
    });
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
