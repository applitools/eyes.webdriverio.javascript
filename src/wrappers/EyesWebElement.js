'use strict';

const WebElement = require('./WebElement');

const {Region, MouseTrigger, ArgumentGuard, CoordinatesType, Location, RectangleSize} = require('@applitools/eyes.sdk.core');


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

    super(eyesDriver.webDriver, webElement.element, webElement.locator);

    /** @type {Logger}*/
    this._logger = logger;
    /** @type {EyesWebDriver}*/
    this._eyesWebDriver = eyesDriver;
    /** @type {WebElement}*/
    this._webElement = webElement;
  }

  /**
   * @return {Promise.<Region>}
   */
  getBounds() {
    let location;
    return this.getLocation().then(res_ => {
      location = res_;
      return this.getSize();
    }).catch(ignored => {
      return null;
    }).then(size => {
      let left = location.getX();
      let top = location.getY();
      let width = 0;
      let height = 0;

      if (size) {
        width = size.getWidth();
        height = size.getHeight();
      }

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
  }

  /**
   * Returns the computed value of the style property for the current element.
   *
   * @param {String} propStyle The style property which value we would like to extract.
   * @return {Promise.<String>} The value of the style property of the element, or {@code null}.
   */
  async getComputedStyle(propStyle) {
    try {
      return await this.executeScript(JS_GET_COMPUTED_STYLE_FORMATTED_STR(propStyle));
    } catch (e) {
      this._logger.verbose("WARNING: getComputedStyle error: " + e);
      throw e;
    }
  }


  /**
   * @param {String} propStyle The style property which value we would like to extract.
   * @return {Promise.<int>} The integer value of a computed style.
   */
  getComputedStyleInteger(propStyle) {
    const that = this;
    return this.getComputedStyle(propStyle).then(value => {
      return Math.round(parseFloat(value.trim().replace('px', '')));
    }).catch(e => {
      that._logger.log(`WARNING: getComputedStyleInteger error: ${e}`);
      throw e;
    });
  }

  /**
   * @return {Promise.<int>} The value of the scrollLeft property of the element.
   */
  async getScrollLeft() {
    const value = await this.executeScript(JS_GET_SCROLL_LEFT);
    return Math.ceil(parseFloat(value));
  }

  /**
   * @return {Promise.<int>} The value of the scrollTop property of the element.
   */
  async getScrollTop() {
    const value = await this.executeScript(JS_GET_SCROLL_TOP);
    return Math.ceil(parseFloat(value));
  }

  /**
   * @return {Promise.<int>} The value of the scrollWidth property of the element.
   */
  async getScrollWidth() {
    const value = await this.executeScript(JS_GET_SCROLL_WIDTH);
    return Math.ceil(parseFloat(value));
  }

  /**
   * @return {Promise.<int>} The value of the scrollHeight property of the element.
   */
  async getScrollHeight() {
    const value = await this.executeScript(JS_GET_SCROLL_HEIGHT);
    return Math.ceil(parseFloat(value));
  }

  /**
   * @return {Promise.<int>}
   */
  async getClientWidth() {
    const value = await this.executeScript(JS_GET_CLIENT_WIDTH);
    return Math.ceil(parseFloat(value));
  }

  /**
   * @return {Promise.<int>}
   */
  async getClientHeight() {
    const value = await this.executeScript(JS_GET_CLIENT_HEIGHT);
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
  async getOverflow() {
    const value = await this.executeScript(JS_GET_OVERFLOW);
    const overflow = Math.ceil(parseFloat(value));
    return overflow ? overflow : null;
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
    const webElementPromise = WebElement.findElement(this._eyesWebDriver.webDriver, this.getWebElement()._locator);

    return webElementPromise.then(webElement => {
      return this._eyesWebDriver.executeScript(script, webElement.element);
    });
  }

  /**
   * @Override
   * @inheritDoc
   */
  getDriver() {
    return this.getWebElement().getDriver();
  }

  /**
   * @Override
   * @return {promise.Thenable.<string>}
   */
  getId() {
    return this.getWebElement().getId();
  }

  /**
   * @Override
   * @inheritDoc
   * return {EyesWebElement}
   */
  findElement(locator) {
    return this.getWebElement().findElement(locator).then(element => {
      return new EyesWebElement(this._logger, this._eyesWebDriver, element);
    });
  }

  /**
   * @Override
   * @inheritDoc
   */
  findElements(locator) {
    const that = this;
    return this.getWebElement().findElements(locator).then(elements => elements.map(element => new EyesWebElement(that._logger, that._eyesWebDriver, element)));
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @Override
   * @inheritDoc
   * @return {Promise}
   */
  click() {
    const that = this;
    // Letting the driver know about the current action.
    return this.getBounds().then(currentControl => {
      that._eyesWebDriver.eyes.addMouseTrigger(MouseTrigger.MouseAction.Click, that);
      that._logger.verbose(`click(${currentControl})`);

      return that.getWebElement().click();
    });
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @Override
   * @inheritDoc
   */
  sendKeys(keysToSend) {
    return super.sendKeys(keysToSend);
  }

  /**
   * @override
   * @inheritDoc
   */
  getTagName() {
    return this.getWebElement().getTagName();
  }

  /**
   * @override
   * @inheritDoc
   */
  getCssValue(cssStyleProperty) {
    return this.getWebElement().getCssValue(cssStyleProperty);
  }

  /**
   * @override
   * @inheritDoc
   */
  getAttribute(attributeName) {
    return this.getWebElement().getAttribute(attributeName);
  }

  /**
   * @override
   * @inheritDoc
   */
  getText() {
    return this.getWebElement().getText();
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @override
   * @inheritDoc
   * @returns {Promise.<RectangleSize>}
   */
  getSize() {
    return super.getSize().then(r => {
      let {width, height} = r;
      return new RectangleSize(width, height);
    });
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @override
   * @inheritDoc
   * @returns {Promise.<Location>}
   */
  getLocation() {
    // The workaround is similar to Java one, but in js we always get raw data with decimal value which we should round up.
    return super.getLocation().then(r => {
      let {x = 0, y = 0} = r;
      x = Math.ceil(x);
      y = Math.ceil(y);
      return new Location(x, y);
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  isEnabled() {
    return this.getWebElement().isEnabled();
  }

  /**
   * @override
   * @inheritDoc
   */
  isSelected() {
    return this.getWebElement().isSelected();
  }

  /**
   * @override
   * @inheritDoc
   */
  submit() {
    return this.getWebElement().submit();
  }

  /**
   * @override
   * @inheritDoc
   */
  clear() {
    return this.getWebElement().clear();
  }

  /**
   * @override
   * @inheritDoc
   */
  isDisplayed() {
    return this.getWebElement().isDisplayed();
  }

  /**
   * @override
   * @inheritDoc
   */
  takeScreenshot(opt_scroll) {
    return this.getWebElement().takeScreenshot(opt_scroll);
  }

  /**
   * @returns {Promise.<{offsetLeft, offsetTop}>}
   */
  getElementOffset() {
    return this.getWebElement().getElementOffset();
  }

  /**
   * @returns {Promise.<{scrollLeft, scrollTop}>}
   */
  getElementScroll() {
    return this.getWebElement().getElementScroll();
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @return {WebElement} The original element object
   */
  getWebElement() {
    return this._webElement;
  }

}

module.exports = EyesWebElement;
