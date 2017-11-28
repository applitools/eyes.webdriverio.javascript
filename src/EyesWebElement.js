"use strict";

const {ArgumentGuard} = require('eyes.sdk');
const EyesUtils = require('eyes.utils');
const GeometryUtils = EyesUtils.GeometryUtils;

/*
 ---

 name: EyesWebElement

 description: Wraps a Web Element.

 ---
 */


const JS_GET_SCROLL_LEFT = "return arguments[0].scrollLeft;";
const JS_GET_SCROLL_TOP = "return arguments[0].scrollTop;";
const JS_GET_SCROLL_WIDTH = "return arguments[0].scrollWidth;";
const JS_GET_SCROLL_HEIGHT = "return arguments[0].scrollHeight;";
const JS_GET_OVERFLOW = "return arguments[0].style.overflow;";
const JS_GET_LOCATION = "var rect = arguments[0].getBoundingClientRect(); return [rect.left, rect.top]";
/**
 * @param {string} styleProp
 * @return {string}
 */
const JS_GET_COMPUTED_STYLE_FORMATTED_STR = function (styleProp) {
  return "var elem = arguments[0], styleProp = '" + styleProp + "'; " +
    "if (window.getComputedStyle) { " +
    "   return window.getComputedStyle(elem, null).getPropertyValue(styleProp);" +
    "} else if (elem.currentStyle) { " +
    "   return elem.currentStyle[styleProp];" +
    "} else { " +
    "   return null;" +
    "}";
};

/**
 * @param {int} scrollLeft
 * @param {int} scrollTop
 * @return {string}
 */
const JS_SCROLL_TO_FORMATTED_STR = function (scrollLeft, scrollTop) {
  return "arguments[0].scrollLeft = " + scrollLeft + "; " +
    "arguments[0].scrollTop = " + scrollTop + ";";
};

/**
 * @param {string} overflow
 * @return {string}
 */
const JS_SET_OVERFLOW_FORMATTED_STR = function (overflow) {
  return "arguments[0].style.overflow = '" + overflow + "'";
};


class EyesWebElement {

  /**
   *
   * Constructor = initializes the module settings
   *
   * @constructor
   * @param {Object} element - WebElement JSON object
   * @param {EyesWebDriver} eyesDriver
   * @param {Logger} logger
   * @arguments WebElement
   **/
  constructor(element, eyesDriver, logger) {
    ArgumentGuard.notNull(logger, "logger");
    ArgumentGuard.notNull(eyesDriver, "eyesDriver");
    ArgumentGuard.notNull(element, "element");

    this._element = element;
    this._logger = logger;
    /** @type {Eyes} */
    this._eyes = eyesDriver;
  }

  static _getRectangle(location, size) {
    size = size || {height: 0, width: 0};
    location = location || {x: 0, y: 0};

    let left = location.x,
      top = location.y,
      width = size.width,
      height = size.height;

    if (left < 0) {
      width = Math.max(0, width + left);
      left = 0;
    }

    if (top < 0) {
      height = Math.max(0, height + top);
      top = 0;
    }

    return {
      top: top,
      left: left,
      width: width,
      height: height
    };
  }

  static _getBounds(element) {
    return element.getLocation().then(function (location) {
      return element.getSize().then(function (size) {
        return EyesWebElement._getRectangle(location, size);
      }, function () {
        return EyesWebElement._getRectangle(location);
      });
    }, function () {
      return EyesWebElement._getRectangle();
    });
  }


  /**
   * Returns the computed value of the style property for the current element.
   * @param {string} propStyle The style property which value we would like to extract.
   * @return {Promise.<string>} The value of the style property of the element, or {@code null}.
   */
  async getComputedStyle(propStyle) {
    const {value} = await this._eyes.jsExecutor.executeScript(JS_GET_COMPUTED_STYLE_FORMATTED_STR(propStyle), this._element);
    return value;
  }

  /**
   * @return {Promise.<int>} The integer value of a computed style.
   */
  async getComputedStyleInteger(propStyle) {
    const value = await this.getComputedStyle(propStyle);
    return Math.round(parseFloat(value.trim().replace("px", "")));
  }

  /**
   * @return {Promise.<int>} The value of the scrollLeft property of the element.
   */
  async getScrollLeft() {
    const {value} = await this._eyes.jsExecutor.executeScript(JS_GET_SCROLL_LEFT, this._element);
    return parseInt(value, 10);
  }

  /**
   * @return {Promise.<int>} The value of the scrollTop property of the element.
   */
  async getScrollTop() {
    const {value} = await this._eyes.jsExecutor.executeScript(JS_GET_SCROLL_TOP, this._element);
    return parseInt(value, 10);
  }

  /**
   * @return {Promise.<int>} The value of the scrollWidth property of the element.
   */
  async getScrollWidth() {
    const {value} = await this._eyes.jsExecutor.executeScript(JS_GET_SCROLL_WIDTH, this._element);
    return parseInt(value, 10);
  }

  /**
   * @return {Promise.<int>} The value of the scrollHeight property of the element.
   */
  async getScrollHeight() {
    const {value} = await this._eyes.jsExecutor.executeScript(JS_GET_SCROLL_HEIGHT, this._element);
    return parseInt(value, 10);
  }

  /**
   * @return {Promise.<int>} The width of the left border.
   */
  getBorderLeftWidth() {
    return this.getComputedStyleInteger("border-left-width");
  }

  /**
   * @return {Promise.<int>} The width of the right border.
   */
  getBorderRightWidth() {
    return this.getComputedStyleInteger("border-right-width");
  }

  /**
   * @return {Promise.<int>} The width of the top border.
   */
  getBorderTopWidth() {
    return this.getComputedStyleInteger("border-top-width");
  }

  /**
   * @return {Promise.<int>} The width of the bottom border.
   */
  getBorderBottomWidth() {
    return this.getComputedStyleInteger("border-bottom-width");
  }

  /**
   * @return {!promise.Thenable<{width: number, height: number}>} element's size
   */
  async getSize() {
    let size = await this._eyes.remoteWebDriver.getElementSize(this._element.selector);

    return GeometryUtils.createSize(size.width, size.height);
  }

  /**
   * @return {!promise.Thenable<{x: number, y: number}>} element's location
   */
  async getLocation() {
    // The workaround is similar to Java one,
    // https://github.com/applitools/eyes.sdk.java3/blob/master/eyes.selenium.java/src/main/java/com/applitools/eyes/selenium/EyesWebElement.java#L453
    // but we can't get raw data (including decimal values) from remote Selenium webdriver
    // and therefore we should use our own client-side script for retrieving exact values and rounding up them

    // this._element.getLocation()
    let location = await this._eyes.remoteWebDriver.getLocation(this._element.selector);
    const x = Math.ceil(location.x) || 0;
    const y = Math.ceil(location.y) || 0;
    return GeometryUtils.createLocation(x, y);
  }

  /**
   * Scrolls to the specified location inside the element.
   * @param {{x: number, y: number}} location The location to scroll to.
   * @return {Promise.<void>}
   */
  scrollTo(location) {
    return this._eyes.jsExecutor.executeScript(JS_SCROLL_TO_FORMATTED_STR(location.x, location.y), this._element);
  }

  /**
   * @return {Promise.<string>} The overflow of the element.
   */
  async getOverflow() {
    const {value} = await this._eyes.jsExecutor.executeScript(JS_GET_OVERFLOW, this._element);
    return value;
  }

  /**
   * @param {string} overflow The overflow to set
   * @return {Promise.<void>} The overflow of the element.
   */
  setOverflow(overflow) {
    return this._eyes.jsExecutor.executeScript(JS_SET_OVERFLOW_FORMATTED_STR(overflow), this._element);
  }

  /**
   * @return {Object} The original element object
   */
  get element() {
    return this._element;
  }

}

module.exports = EyesWebElement;
