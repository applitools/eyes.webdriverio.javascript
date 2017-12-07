'use strict';

const FrameChain = require('../frames/FrameChain');
const EyesWebElement = require('./EyesWebElement');
const EyesTargetLocator = require('./EyesTargetLocator');
const WebElement = require('./WebElement');
const WebDriver = require('./WebDriver');
const EyesWDIOUtils = require('../EyesWDIOUtils');

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
   * @param {WebDriver} remoteWebDriver
   * @param {Eyes} eyes An instance of Eyes
   * @param {Object} logger
   **/
  constructor(remoteWebDriver, eyes, logger) {
    this._driver = remoteWebDriver;
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
    return this._driver;
  }

  get remoteWebDriver() {
    return this._driver.remoteWebDriver;
  }

  /**
   * @return {number} The degrees by which to rotate.
   */
  get rotation() {
    return this._rotation;
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
      return EyesWDIOUtils.getViewportSizeOrDisplaySize(that._logger, that._driver);
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
  async getUserAgent() {
    try {
      let {value: userAgent} = await this._driver.execute('return navigator.userAgent');
      this._logger.verbose("user agent: " + userAgent);
      return userAgent;
    } catch (e) {
      this._logger.verbose("Failed to obtain user-agent string");
      return null;
    }
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   * @returns {FrameChain}
   */
  get frameChain() {
    return this._frameChain;
  }


  /**
   * @override
   * @return {EyesTargetLocator} The target locator interface for this instance.
   */
  switchTo() {
    this._logger.verbose("switchTo()");
    return new EyesTargetLocator(this._logger, this, this._driver.switchTo());
  }


  /**
   * @param {By} locator
   * @return {EyesWebElement}
   */
  async findElement(locator) {
    let element = await this.remoteWebDriver.element(locator.value);
    return new EyesWebElement(this._logger, this, new WebElement(this._driver, element));
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   * @param {By} locator
   * @return {Promise.<EyesWebElement[]>}
   */
  async findElements(locator) {
    const elements = await this.remoteWebDriver.elements(locator.value);
    return elements.map(function (element) {
      return new EyesWebElement(element, this, this._logger);
    });
  }


  /**
   *
   * @param {String} script
   * @param var_args
   * @returns {*}
   */
  async executeScript(script, ...var_args) {
    try {
      return await this.remoteWebDriver.execute(script, ...var_args);
    } catch (e) {
      this._logger.verbose("WARNING: getComputedStyle error: " + e);
      throw e;
    } finally {
      this._logger.verbose('Done!');
    }
  }


    /** @override */
  getTitle() {
    return this.remoteWebDriver.getTitle();
  }


}

module.exports = EyesWebDriver;
