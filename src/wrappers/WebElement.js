'use strict';


const {ArgumentGuard} = require('@applitools/eyes-sdk-core');
const command = require('../services/selenium/Command');

/**
 * Wrapper for Webdriverio element
 */

class WebElement {

  /**
   * @param {WebDriver} driver
   * @param {Object} element WebElement JSON object
   * @param {By|Object} locator
   */
  constructor(driver, element, locator) {
    ArgumentGuard.notNull(locator, "locator");

    this._driver = driver;
    this._element = element;
    this._locator = locator;
  }


  /**
   * @param {WebDriver} driver
   * @param {By} locator
   * @param {int} [retry]
   * @return {Promise.<WebElement>}
   */
  static findElement(driver, locator, retry = 0) {
    return driver.remoteWebDriver.element(locator.value).then(r => {
      const {value: element} = r;
      return new WebElement(driver, element, locator);
    }).catch(e => {
      const number = 3;
      if (retry > number) {
        throw e;
      } else {
        return WebElement.findElement(driver, locator, retry++);
      }
    });
  }


  /**
   * @todo
   */
  findElements(locator) {

  }


  /**
   * @returns {Promise.<{x, y}>}
   */
  getLocation() {
    return this._driver.remoteWebDriver.elementIdLocation(this._element.ELEMENT).then(r => {
      const {value: location} = r;
      return location;
    });
  }


  /**
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
    // todo need to replace elementIdSize and elementIdLocation to elementIdRect
    return this._driver.remoteWebDriver.elementIdRect(this._element.ELEMENT).then(r => {
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
      return {offsetLeft: parseInt(offsetLeft), offsetTop: parseInt(offsetTop_.value)};
    });
  }

  /**
   * @returns {Promise.<{scrollLeft, scrollTop}>}
   */
  getElementScroll() {
    const that = this;
    let scrollLeft;
    return that._driver.remoteWebDriver.elementIdAttribute(this._element.ELEMENT, 'scrollLeft').then(scrollLeft_ => {
      scrollLeft = scrollLeft_.value;
      return that._driver.remoteWebDriver.elementIdAttribute(this._element.ELEMENT, 'scrollTop');
    }).then(scrollTop_ => {
      return {scrollLeft: parseInt(scrollLeft), scrollTop: parseInt(scrollTop_.value)};
    });
  }

  /**
   * @returns {EyesWebDriver}
   */
  getDriver() {
    return this._driver;
  }

  /**
   * @return {Object|*}
   */
  get element() {
    return this._element;
  }

  get locator() {
    return this._locator;
  }

}

module.exports = WebElement;
