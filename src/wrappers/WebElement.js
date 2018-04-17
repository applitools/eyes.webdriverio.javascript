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
