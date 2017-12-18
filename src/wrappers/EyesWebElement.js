'use strict';

const {RectangleSize} = require('eyes.sdk');

const WebElement = require('./WebElement');


const {Region, MouseTrigger, ArgumentGuard, CoordinatesType} = require('eyes.sdk');

const JS_GET_SCROLL_LEFT = "return arguments[0].scrollLeft;";

const JS_GET_SCROLL_TOP = "return arguments[0].scrollTop;";

const JS_GET_SCROLL_WIDTH = "return arguments[0].scrollWidth;";

const JS_GET_SCROLL_HEIGHT = "return arguments[0].scrollHeight;";

const JS_GET_OVERFLOW = "return arguments[0].style.overflow;";

const JS_GET_CLIENT_WIDTH = "return arguments[0].clientWidth;";
const JS_GET_CLIENT_HEIGHT = "return arguments[0].clientHeight;";

/**
 * @param {String} styleProp
 * @return {String}
 */
const JS_GET_COMPUTED_STYLE_FORMATTED_STR = function getScript(styleProp) {
  return `var elem = arguments[0], styleProp = '${styleProp}'; 
    if (window.getComputedStyle) { 
       return window.getComputedStyle(elem, null).getPropertyValue(styleProp);
    } else if (elem.currentStyle) { 
       return elem.currentStyle[styleProp];
    } else { 
       return null;
    }`;
};

/**
 * @param {int} scrollLeft
 * @param {int} scrollTop
 * @return {String}
 */
const JS_SCROLL_TO_FORMATTED_STR = function getScript(scrollLeft, scrollTop) {
  return "arguments[0].scrollLeft = " + scrollLeft + "; " +
    "arguments[0].scrollTop = " + scrollTop + ";";
};

/**
 * @param {String} overflow
 * @return {String}
 */
const JS_SET_OVERFLOW_FORMATTED_STR = function getScript(overflow) {
  return "arguments[0].style.overflow = '" + overflow + "'";
};

/**
 * Wraps a Webdriverio Web Element.
 */
class EyesWebElement extends WebElement {

  /**
   * @param {Logger} logger
   * @param {EyesWebDriver} eyesDriver
   * @param {WebElement} webElement
   *
   **/
  constructor(logger, eyesDriver, webElement) {
    ArgumentGuard.notNull(logger, "logger");
    ArgumentGuard.notNull(eyesDriver, "eyesDriver");
    ArgumentGuard.notNull(webElement, "webElement");

    super(eyesDriver.webDriver, webElement.element);

    this._logger = logger;
    /** @type {EyesWebDriver}*/
    this._eyesDriver = eyesDriver;
    this._webElement = webElement;
  }

  /**
   * @return {Promise.<Region>}
   */
  getBounds() {
    const that = this;
    return that.getLocation().then(/** @type {{x: number, y: number}} */location_ => {
      let left = location_.x;
      let top = location_.y;
      let width = 0;
      let height = 0;

      return that.getSize().then(/** @type {{width: number, height: number}} */size_ => {
        width = size_.width;
        height = size_.height;
      }).catch(err => {
        // Not supported on all platforms.
      }).then(() => {
        if (left < 0) {
          width = Math.max(0, width + left);
          left = 0;
        }

        if (top < 0) {
          height = Math.max(0, height + top);
          top = 0;
        }

        return new Region(left, top, width, height, CoordinatesType.CONTEXT_RELATIVE);
      });
    });
  }

  /**
   * Returns the computed value of the style property for the current element.
   *
   * @param {String} propStyle The style property which value we would like to extract.
   * @return {Promise.<String>} The value of the style property of the element, or {@code null}.
   */
  async getComputedStyle(propStyle) {
    try {
      const {value} = await this._executeScript(JS_GET_COMPUTED_STYLE_FORMATTED_STR(propStyle));
      return value;
    } catch (e) {
      this._logger.verbose("WARNING: getComputedStyle error: " + e);
      throw e;
    }
  }


  /**
   * @param {String} propStyle The style property which value we would like to extract.
   * @return {Promise.<int>} The integer value of a computed style.
   */
  async getComputedStyleInteger(propStyle) {
    try {
      const value = await this.getComputedStyle(propStyle);
      return Math.round(parseFloat(value.trim().replace("px", "")));
    } catch (e) {
      this._logger.log("WARNING: getComputedStyleInteger error: " + e);
      throw e;
    }
  }

  /**
   * @return {Promise.<int>} The value of the scrollLeft property of the element.
   */
  async getScrollLeft() {
    const {value} = await this._executeScript(JS_GET_SCROLL_LEFT);
    return Math.ceil(parseFloat(value));
  }

  /**
   * @return {Promise.<int>} The value of the scrollTop property of the element.
   */
  async getScrollTop() {
    const {value} = await this._executeScript(JS_GET_SCROLL_TOP);
    return Math.ceil(parseFloat(value));
  }

  /**
   * @return {Promise.<int>} The value of the scrollWidth property of the element.
   */
  async getScrollWidth() {
    const {value} = await this._executeScript(JS_GET_SCROLL_WIDTH);
    return Math.ceil(parseFloat(value));
  }

  /**
   * @return {Promise.<int>} The value of the scrollHeight property of the element.
   */
  async getScrollHeight() {
    const {value} = await this._executeScript(JS_GET_SCROLL_HEIGHT);
    return Math.ceil(parseFloat(value));
  }

  /**
   * @return {Promise.<int>}
   */
  async getClientWidth() {
    const {value} = await this.executeScript(JS_GET_CLIENT_WIDTH);
    return Math.ceil(parseFloat(value));
  }

  /**
   * @return {Promise.<int>}
   */
  async getClientHeight() {
    const {value} = await this.executeScript(JS_GET_CLIENT_HEIGHT);
    return Math.ceil(parseFloat(value));
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @return {Promise.<int>} The width of the left border.
   */
  getBorderLeftWidth() {
    return this.getComputedStyleInteger("border-left-width");
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @return {Promise.<int>} The width of the right border.
   */
  getBorderRightWidth() {
    return this.getComputedStyleInteger("border-right-width");
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @return {Promise.<int>} The width of the top border.
   */
  getBorderTopWidth() {
    return this.getComputedStyleInteger("border-top-width");
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @return {Promise.<int>} The width of the bottom border.
   */
  getBorderBottomWidth() {
    return this.getComputedStyleInteger("border-bottom-width");
  }

  /**
   * Scrolls to the specified location inside the element.
   *
   * @param {Location} location The location to scroll to.
   * @return {Promise}
   */
  scrollTo(location) {
    return this.executeScript(JS_SCROLL_TO_FORMATTED_STR(location.getX(), location.getY()));
  }

  /**
   * @return {Promise.<String>} The overflow of the element.
   */
  getOverflow() {
    return this.executeScript(JS_GET_OVERFLOW);
  }

  /**
   * @param {String} overflow The overflow to set
   * @return {Promise} The overflow of the element.
   */
  setOverflow(overflow) {
    return this.executeScript(JS_SET_OVERFLOW_FORMATTED_STR(overflow));
  }

  /**
   * @param {String} script The script to execute with the element as last parameter
   * @returns {Promise} The result returned from the script
   */
  executeScript(script) {
    return this._executeScript(script);
  }

  /**
   * @Override
   * @inheritDoc
   */
  getDriver() {
    return this._webElement.getDriver();
  }

  /**
   * @Override
   * @return {promise.Thenable.<string>}
   */
  getId() {
    return this._webElement.getId();
  }

  /**
   * @Override
   * @inheritDoc
   */
  async findElement(locator) {
    const that = this;
    const element = await this._webElement.findElement(locator);
    return new EyesWebElement(that._logger, that._eyesDriver, element);
  }

  /**
   * @Override
   * @inheritDoc
   */
  findElements(locator) {
    const that = this;
    return this._webElement.findElements(locator).then(elements => elements.map(element => new EyesWebElement(that._logger, that._eyesDriver, element)));
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @Override
   * @inheritDoc
   * @return {Promise}
   */
  click() {
    // Letting the driver know about the current action.
    const that = this;
    return that.getBounds().then(currentControl => {
      that._eyesDriver.eyes.addMouseTrigger(MouseTrigger.MouseAction.Click, this);
      that._logger.verbose(`click(${currentControl})`);

      return that._webElement.click();
    });
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @Override
   * @inheritDoc
   */
  sendKeys(...keysToSend) {
    const that = this;
    return keysToSend.reduce((promise, keys) => {
      return promise.then(() => that._eyesDriver.eyes.addTextTriggerForElement(this._webElement, String(keys)));
    }, that._eyesDriver.getPromiseFactory().resolve()).then(() => {
      return that._webElement.sendKeys(...keysToSend);
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  getTagName() {
    return this._webElement.getTagName();
  }

  /**
   * @override
   * @inheritDoc
   */
  getCssValue(cssStyleProperty) {
    return this._webElement.getCssValue(cssStyleProperty);
  }

  /**
   * @override
   * @inheritDoc
   */
  getAttribute(attributeName) {
    return this._webElement.getAttribute(attributeName);
  }

  /**
   * @override
   * @inheritDoc
   */
  getText() {
    return this._webElement.getText();
  }

  /**
   * @override
   * @inheritDoc
   */
  async getSize() {
    let {value: {width}, value: {height}} = await this._webElement.getSize();
    return new RectangleSize(width, height);
  }

  /**
   * @override
   * @inheritDoc
   */
  async getLocation() {
    // The workaround is similar to Java one, but in js we always get raw data with decimal value which we should round up.
    console.log(1);
    let {value: {x = 0}, value: {y = 0}} = await super.getLocation();
    x = Math.ceil(x);
    y = Math.ceil(y);
    return {x, y};
  }

  /**
   * @override
   * @inheritDoc
   */
  isEnabled() {
    return this._webElement.isEnabled();
  }

  /**
   * @override
   * @inheritDoc
   */
  isSelected() {
    return this._webElement.isSelected();
  }

  /**
   * @override
   * @inheritDoc
   */
  submit() {
    return this._webElement.submit();
  }

  /**
   * @override
   * @inheritDoc
   */
  clear() {
    return this._webElement.clear();
  }

  /**
   * @override
   * @inheritDoc
   */
  isDisplayed() {
    return this._webElement.isDisplayed();
  }

  /**
   * @override
   * @inheritDoc
   */
  takeScreenshot(opt_scroll) {
    return this._webElement.takeScreenshot(opt_scroll);
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @return {WebElement} The original element object
   */
  getWebElement() {
    return this._webElement;
  }

  /**
   * @param {String} script
   * @returns {Promise<T>}
   * @private
   */
  _executeScript(script) {
    return this._eyesDriver.executeScript(script, this._webElement._element);
  }
}

module.exports = EyesWebElement;
