"use strict";

const EyesUtils = require('eyes.utils'),
  EyesRemoteWebElement = require('./EyesRemoteWebElement');
const GeneralUtils = EyesUtils.GeneralUtils;

/*
 ---

 name: ElementFinderWrapper

 description: Wraps Protractor's ElementFinder to make sure we return our own Web Element.

 ---
 */

class ElementFinderWrapper {


  // functions in ElementFinder that return a new ElementFinder and therefore we must wrap and return our own
  static get ELEMENT_FINDER_TO_ELEMENT_FINDER_FUNCTIONS() {
    return ['element', '$', 'evaluate', 'allowAnimations'];
  }

  // functions in ElementFinder that return a new ElementArrayFinder and therefore we must wrap and return our own
  static get ELEMENT_FINDER_TO_ELEMENT_ARRAY_FINDER_FUNCTIONS() {
    return ['all', '$$'];
  }

  // function in ElementArrayFinder that return a new ElementFinder and therefore we must wrap and return our own
  static get ELEMENT_ARRAY_FINDER_TO_ELEMENT_FINDER_FUNCTIONS() {
    return ['get', 'first', 'last'];
  }

  /**
   * Wrapper for ElementFinder object from Protractor
   *
   * @param {ElementFinder} finder
   * @param {EyesWebDriver} eyesDriver
   * @param {Logger} logger
   * @constructor
   **/
  constructor(finder, eyesDriver, logger) {
    GeneralUtils.mixin(this, finder);

    this._logger = logger;
    this._eyesDriver = eyesDriver;
    this._finder = finder;

    const that = this;
    ElementFinderWrapper.ELEMENT_FINDER_TO_ELEMENT_FINDER_FUNCTIONS.forEach(function (fnName) {
      that[fnName] = function () {
        return new ElementFinderWrapper(that._finder[fnName].apply(that._finder, arguments), that._eyesDriver, that._logger);
      };
    });

    ElementFinderWrapper.ELEMENT_FINDER_TO_ELEMENT_ARRAY_FINDER_FUNCTIONS.forEach(function (fnName) {
      that[fnName] = function () {
        return new ElementFinderWrapper.ElementArrayFinderWrapper(that._finder[fnName].apply(that._finder, arguments), that._eyesDriver, that._logger);
      };
    });
  }

  /**
   * Wrap the getWebElement function
   *
   * @returns {EyesRemoteWebElement}
   */
  getWebElement() {
    this._logger.verbose("ElementFinderWrapper:getWebElement - called");
    return new EyesRemoteWebElement(this._finder.getWebElement.apply(this._finder), this._eyesDriver, this._logger);
  }

  /**
   * Wrap the click function
   *
   * @returns {Promise.<EyesRemoteWebElement>}
   */
  click() {
    this._logger.verbose("ElementFinderWrapper:click - called");
    const element = this.getWebElement();
    return element.click.apply(element);
  }

  /**
   * Wrap the functions that return objects that require pre-wrapping
   *
   * @returns {Promise.<EyesRemoteWebElement>}
   */
  sendKeys() {
    this._logger.verbose("ElementFinderWrapper:sendKeys - called");
    const element = this.getWebElement();
    return element.sendKeys.apply(element, arguments);
  }

  /**
   * Wrapper for ElementArrayFinder object from Protractor
   *
   * @param {ElementArrayFinder} arrayFinder
   * @param {EyesWebDriver} eyesDriver
   * @param {Logger} logger
   * @constructor
   **/
  static get ElementArrayFinderWrapper () {
    return class {
      constructor(arrayFinder, eyesDriver, logger) {
        GeneralUtils.mixin(this, arrayFinder);

        this._logger = logger;
        this._eyesDriver = eyesDriver;
        this._arrayFinder = arrayFinder;

        const that = this;
        // Wrap the functions that return objects that require pre-wrapping
        ElementFinderWrapper.ELEMENT_ARRAY_FINDER_TO_ELEMENT_FINDER_FUNCTIONS.forEach(function (fnName) {
          that[fnName] = function () {
            return new ElementFinderWrapper(that._arrayFinder[fnName].apply(that._arrayFinder, arguments), that._eyesDriver, that._logger);
          };
        });

        // Patch this internal function.
        const originalFn = that._arrayFinder.asElementFinders_;
        that._arrayFinder.asElementFinders_ = function () {
          return originalFn.apply(that._arrayFinder).then(function (arr) {
            const list = [];
            arr.forEach(function (finder) {
              list.push(new ElementFinderWrapper(finder, that._eyesDriver, that._logger));
            });
            return list;
          });
        }
      }


      /**
       * Wrap the getWebElements function
       *
       * @returns {Promise.<EyesRemoteWebElement[]>}
       */
      getWebElements() {
        const that = this;
        that._logger.verbose("ElementArrayFinderWrapper:getWebElements - called");
        return that._arrayFinder.getWebElements.apply(that._arrayFinder).then(function (elements) {
          const res = [];
          elements.forEach(function (el) {
            res.push(new EyesRemoteWebElement(el, that._eyesDriver, that._logger));
          });
          return res;
        });
      }
    }
  }

}

module.exports.ElementFinderWrapper = ElementFinderWrapper;
module.exports.ElementArrayFinderWrapper = ElementFinderWrapper.ElementArrayFinderWrapper;
