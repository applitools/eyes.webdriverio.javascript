'use strict';

const {ArgumentGuard, MutableImage} = require('@applitools/eyes.sdk.core');
const FrameChain = require('../frames/FrameChain');
const EyesWebElement = require('./EyesWebElement');
const EyesTargetLocator = require('./EyesTargetLocator');
const WebElement = require('./WebElement');
const WebDriver = require('./WebDriver');
const EyesWDIOUtils = require('../EyesWDIOUtils');
const By = require('../By');

/*
 ---

 name: EyesWebDriver

 description: Wraps a Remote Web Driver.

 ---
 */

class EyesWebDriver {

  /**
   *
   * C'tor = initializes the module settings
   *
   * @constructor
   * @param {WebDriver} webDriver
   * @param {Eyes} eyes An instance of Eyes
   * @param {Object} logger
   **/
  constructor(webDriver, eyes, logger) {
    /** @type {WebDriver} */
    this._tsInstance = webDriver;
    /** @type {Eyes} */
    this._eyes = eyes;
    this._logger = logger;

    this._frameChain = new FrameChain(this._logger, null);
    // this._defaultContentViewportSize = null;
    this._rotation = null;
  }

  //noinspection JSUnusedGlobalSymbols
  get eyes() {
    return this._eyes;
  }

  //noinspection JSUnusedGlobalSymbols
  set eyes(eyes) {
    this._eyes = eyes;
  }

  //noinspection JSUnusedGlobalSymbols
  get webDriver() {
    return this._tsInstance;
  }

  get remoteWebDriver() {
    return this._tsInstance.remoteWebDriver;
  }

  /**
   * @return {number} The degrees by which to rotate.
   */
  get rotation() {
    return this._rotation;
  }


  sleep(ms) {
    return this._tsInstance.sleep(ms);
  }


  /** @override */
  getCapabilities() {
    return this._tsInstance.remoteWebDriver.getCapabilities();
  }


  quit() {
    return this._tsInstance.quit();
  }


  /**
   * @param {number} rotation The image rotation data.
   */
  set rotation(rotation) {
    this._rotation = rotation;
  }


  /**
   * @return {PromiseFactory}
   */
  getPromiseFactory() {
    return this._eyes.getPromiseFactory();
  }


  /**
   * @param {boolean} [forceQuery=false] If true, we will perform the query even if we have a cached viewport size.
   * @return {Promise.<RectangleSize>} The viewport size of the default content (outer most frame).
   */
  getDefaultContentViewportSize(forceQuery = false) {
    const that = this;
    that._logger.verbose("getDefaultContentViewportSize()");
    if (that._defaultContentViewportSize && !forceQuery) {
      that._logger.verbose("Using cached viewport size: ", that._defaultContentViewportSize);
      return that.getPromiseFactory().resolve(that._defaultContentViewportSize);
    }

    const switchTo = that.switchTo();
    const currentFrames = new FrameChain(that._logger, that.getFrameChain());

    let promise = that.getPromiseFactory().resolve();

    // Optimization
    if (currentFrames.size() > 0) {
      promise = promise.then(() => switchTo.defaultContent());
    }

    promise = promise.then(() => {
      that._logger.verbose("Extracting viewport size...");
      return EyesWDIOUtils.getViewportSizeOrDisplaySize(that._logger, that.eyes.jsExecutor);
    }).then(defaultContentViewportSize => {
      that._defaultContentViewportSize = defaultContentViewportSize;
      that._logger.verbose("Done! Viewport size: ", that._defaultContentViewportSize);
    });

    if (currentFrames.size() > 0) {
      promise = promise.then(() => switchTo.frames(currentFrames));
    }

    return promise.then(() => {
      return that._defaultContentViewportSize;
    });
  }


  //noinspection JSUnusedGlobalSymbols
  getUserAgent() {
    const that = this;
    return this.remoteWebDriver.execute('return navigator.userAgent').then(res_ => {
      let {value: userAgent} = res_;
      that._logger.verbose("user agent: " + userAgent);
      return userAgent;
    }).catch(() => {
      this._logger.verbose("Failed to obtain user-agent string");
      return null;
    });
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   * @returns {FrameChain}
   */
  getFrameChain() {
    return this._frameChain;
  }


  /**
   * @override
   * @return {EyesTargetLocator} The target locator interface for this instance.
   */
  switchTo() {
    this._logger.verbose("switchTo()");
    return new EyesTargetLocator(this._logger, this, this._tsInstance.switchTo());
  }


  /**
   * @param {By} locator
   * @return {Promise.<EyesWebElement>}
   */
  findElement(locator) {
    return this.remoteWebDriver.element(locator.value).then(res_ => {
      let {value: element} = res_;
      return new EyesWebElement(this._logger, this, new WebElement(this._tsInstance, element, locator));
    });
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   * @param {By} locator
   * @return {Promise.<EyesWebElement[]>}
   */
  findElements(locator) {
    return this.remoteWebDriver.elements(locator.value).then(res_ => {
      const {value: elements} = res_;

      return elements.map((element) => {
        return new EyesWebElement(this._logger, this, new WebElement(this._tsInstance, element, locator));
      });
    });
  }


  /**
   * @param {String} id
   * @return {Promise.<EyesWebElement>} A promise that will resolve to a EyesWebElement.
   */
  findElementById(id) {
    return this.findElement(By.id(id));
  }


  /**
   * @param {String} id
   * @return {!Promise.<!Array<!EyesWebElement>>} A promise that will resolve to an array of EyesWebElements.
   */
  findElementsById(id) {
    return this.findElements(By.id(id));
  }


  /**
   * @param {String} name
   * @return {Promise.<EyesWebElement>} A promise that will resolve to a EyesWebElement.
   */
  findElementByName(name) {
    return this.findElement(By.name(name));
  }


  /**
   * @param {String} name
   * @return {!Promise.<!Array<!EyesWebElement>>} A promise that will resolve to an array of EyesWebElements.
   */
  findElementsByName(name) {
    return this.findElements(By.name(name));
  }


  /** @override */
  takeScreenshot() {
    // Get the image as base64.
    return this._tsInstance.takeScreenshot().then(screenshot64 => {
      let screenshot = new MutableImage(screenshot64, this.getPromiseFactory());
      return EyesWebDriver.normalizeRotation(this._logger, this._tsInstance, screenshot, this._rotation, this.getPromiseFactory());
    }).then(screenshot => {
      return screenshot.getImageBase64();
    });
  }

  /**
   *
   * @param {String} script
   * @param var_args
   * @returns {*}
   */
  executeScript(script, ...var_args) {
    const that = this;
    return this.remoteWebDriver.execute(script, ...var_args).catch(e => {
      that._logger.verbose("WARNING: getComputedStyle error: " + e);
      throw e;
    }).then(result => {
      that._logger.verbose('Done!');
      return result;
    });
  }


  /** @override */
  getTitle() {
    return this.remoteWebDriver.getTitle();
  }


  /**
   * Rotates the image as necessary. The rotation is either manually forced by passing a non-null ImageRotation, or automatically inferred.
   *
   * @param {Logger} logger The underlying driver which produced the screenshot.
   * @param {WebDriver} driver The underlying driver which produced the screenshot.
   * @param {MutableImage} image The image to normalize.
   * @param {ImageRotation} rotation The degrees by which to rotate the image:
   *                 positive values = clockwise rotation,
   *                 negative values = counter-clockwise,
   *                 0 = force no rotation,
   *                 null = rotate automatically as needed.
   * @param {PromiseFactory} promiseFactory
   * @return {Promise.<MutableImage>} A normalized image.
   */
  static normalizeRotation(logger, driver, image, rotation, promiseFactory) {
    ArgumentGuard.notNull(logger, "logger");
    ArgumentGuard.notNull(driver, "driver");
    ArgumentGuard.notNull(image, "image");

    return promiseFactory.resolve().then(() => {
      if (rotation) {
        return rotation.getRotation();
      } else {
        return EyesWDIOUtils.tryAutomaticRotation(logger, driver, image);
      }
    }).then(degrees => image.rotate(degrees));
  }

}

module.exports = EyesWebDriver;
