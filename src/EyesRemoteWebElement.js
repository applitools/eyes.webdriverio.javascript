"use strict";

const EyesSDK = require('eyes.sdk'),
  EyesUtils = require('eyes.utils');
const MouseAction = EyesSDK.MouseTrigger.MouseAction,
  GeneralUtils = EyesUtils.GeneralUtils,
  GeometryUtils = EyesUtils.GeometryUtils;

/*
 ---

 name: EyesRemoteWebElement

 description: Wraps a Remote Web Element.

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


class EyesRemoteWebElement {

  /**
     *
     * C'tor = initializes the module settings
     *
     * @constructor
     * @param {WebElement} remoteWebElement
     * @param {EyesWebDriver} eyesDriver
     * @param {Logger} logger
     * @augments WebElement
     **/
    constructor(remoteWebElement, eyesDriver, logger) {
        this._element = remoteWebElement;
        this._logger = logger;
        this._eyesDriver = eyesDriver;
        GeneralUtils.mixin(this, remoteWebElement);

        // remove then method, which comes from thenableWebElement (Selenium 3+)
        delete this.then;
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

    static _getBounds (element) {
        return element.getLocation().then(function (location) {
            return element.getSize().then(function (size) {
                return EyesRemoteWebElement._getRectangle(location, size);
            }, function () {
                return EyesRemoteWebElement._getRectangle(location);
            });
        }, function () {
            return EyesRemoteWebElement._getRectangle();
        });
    }

    static registerSendKeys (element, eyesDriver, logger, args) {
      const text = args.join('');
      logger.verbose("registerSendKeys: text is", text);
        return EyesRemoteWebElement._getBounds(element).then(function (rect) {
            eyesDriver.getEyes().addKeyboardTrigger(rect, text);
        });
    }

    sendKeys  () {
      const that = this, args = Array.prototype.slice.call(arguments, 0);
      return EyesRemoteWebElement.registerSendKeys(that._element, that._eyesDriver, that._logger, args).then(function () {
            return that._element.sendKeys.apply(that._element, args);
        });
    }

    static registerClick  (element, eyesDriver, logger) {
        logger.verbose("apply click on element");
        return EyesRemoteWebElement._getBounds(element).then(function (rect) {
          const offset = {x: rect.width / 2, y: rect.height / 2};
          eyesDriver.getEyes().addMouseTrigger(MouseAction.Click, rect, offset);
        });
    }

    click  () {
      const that = this;
      that._logger.verbose("click on element");
        return EyesRemoteWebElement.registerClick(that._element, that._eyesDriver, that._logger).then(function () {
            return that._element.click();
        });
    }

    findElement  (locator) {
      const that = this;
      return this._element.findElement(locator).then(function (element) {
            return new EyesRemoteWebElement(element, that._eyesDriver, that._logger);
        });
    }

    findElements  (locator) {
      const that = this;
      return this._element.findElements(locator).then(function (elements) {
            return elements.map(function (element) {
                return new EyesRemoteWebElement(element, that._eyesDriver, that._logger);
            });
        });
    }

    /**
     * Returns the computed value of the style property for the current element.
     * @param {string} propStyle The style property which value we would like to extract.
     * @return {promise.Promise.<string>} The value of the style property of the element, or {@code null}.
     */
    getComputedStyle  (propStyle) {
        return this._eyesDriver.executeScript(JS_GET_COMPUTED_STYLE_FORMATTED_STR(propStyle), this._element);
    }

    /**
     * @return {promise.Promise.<int>} The integer value of a computed style.
     */
    getComputedStyleInteger  (propStyle) {
        return this.getComputedStyle(propStyle).then(function (value) {
            return Math.round(parseFloat(value.trim().replace("px", "")));
        });
    }

    /**
     * @return {promise.Promise.<int>} The value of the scrollLeft property of the element.
     */
    getScrollLeft () {
        return this._eyesDriver.executeScript(JS_GET_SCROLL_LEFT, this._element).then(function (value) {
            return parseInt(value, 10);
        });
    }

    /**
     * @return {promise.Promise.<int>} The value of the scrollTop property of the element.
     */
    getScrollTop   () {
        return this._eyesDriver.executeScript(JS_GET_SCROLL_TOP, this._element).then(function (value) {
            return parseInt(value, 10);
        });
    }

    /**
     * @return {promise.Promise.<int>} The value of the scrollWidth property of the element.
     */
    getScrollWidth   () {
        return this._eyesDriver.executeScript(JS_GET_SCROLL_WIDTH, this._element).then(function (value) {
            return parseInt(value, 10);
        });
    }

    /**
     * @return {promise.Promise.<int>} The value of the scrollHeight property of the element.
     */
    getScrollHeight() {
        return this._eyesDriver.executeScript(JS_GET_SCROLL_HEIGHT, this._element).then(function (value) {
            return parseInt(value, 10);
        });
    }

    /**
     * @return {promise.Promise.<int>} The width of the left border.
     */
    getBorderLeftWidth  () {
        return this.getComputedStyleInteger("border-left-width");
    }

    /**
     * @return {promise.Promise.<int>} The width of the right border.
     */
    getBorderRightWidth  () {
        return this.getComputedStyleInteger("border-right-width");
    }

    /**
     * @return {promise.Promise.<int>} The width of the top border.
     */
    getBorderTopWidth  () {
        return this.getComputedStyleInteger("border-top-width");
    }

    /**
     * @return {promise.Promise.<int>} The width of the bottom border.
     */
    getBorderBottomWidth  () {
        return this.getComputedStyleInteger("border-bottom-width");
    }

    /**
     * @return {!promise.Thenable<{width: number, height: number}>} element's size
     */
    getSize  () {
        return this._element.getSize().then(function (value) {
            return GeometryUtils.createSize(value.width, value.height);
        });
    }

    /**
     * @return {!promise.Thenable<{x: number, y: number}>} element's location
     */
    getLocation  () {
        // The workaround is similar to Java one,
        // https://github.com/applitools/eyes.sdk.java3/blob/master/eyes.selenium.java/src/main/java/com/applitools/eyes/selenium/EyesRemoteWebElement.java#L453
        // but we can't get raw data (including decimal values) from remote Selenium webdriver
        // and therefore we should use our own client-side script for retrieving exact values and rounding up them

        // this._element.getLocation()
        return this._eyesDriver.executeScript(JS_GET_LOCATION, this._element).then(function (value) {
          const x = Math.ceil(value[0]) || 0;
          const y = Math.ceil(value[1]) || 0;
          return GeometryUtils.createLocation(x, y);
        });
    }

    /**
     * Scrolls to the specified location inside the element.
     * @param {{x: number, y: number}} location The location to scroll to.
     * @return {promise.Promise.<void>}
     */
    scrollTo  (location) {
        return this._eyesDriver.executeScript(JS_SCROLL_TO_FORMATTED_STR(location.x, location.y), this._element);
    }

    /**
     * @return {promise.Promise.<string>} The overflow of the element.
     */
    getOverflow  () {
        return this._eyesDriver.executeScript(JS_GET_OVERFLOW, this._element);
    }

    /**
     * @param {string} overflow The overflow to set
     * @return {promise.Promise.<void>} The overflow of the element.
     */
    setOverflow  (overflow) {
        return this._eyesDriver.executeScript(JS_SET_OVERFLOW_FORMATTED_STR(overflow), this._element);
    }

    /**
     * @return {WebElement} The original element object
     */
    getRemoteWebElement  () {
        return this._element;
    }

}

module.exports = EyesRemoteWebElement;
