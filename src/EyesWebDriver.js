'use strict';

const FrameChain = require('./FrameChain');
const EyesWebElement = require('./EyesWebElement');

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
   * @param {Object} remoteWebDriver
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
  get remoteWebDriver() {
    return this._driver;
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

  //noinspection JSUnusedGlobalSymbols
  getUserAgent() {
    try {
      let userAgent = this._driver.executeScript('return navigator.userAgent');
      this._logger.verbose("user agent: " + userAgent);
      return userAgent;
    } catch (e) {
      this._logger.verbose("Failed to obtain user-agent string");
      return null;
    }
  }


  // noinspection JSUnusedGlobalSymbols
  get frameChain() {
    return this._frameChain;
  }

  /**
   * @param {By} locator
   * @return {EyesWebElement}
   */
  async findElement(locator) {
    let element = await this._driver.element(locator.value);
    return new EyesWebElement(element, this, this._logger);
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   * @param {By} locator
   * @return {Promise.<EyesWebElement[]>}
   */
  async findElements(locator) {
    const elements = await this._driver.elements(locator.value);
    return elements.map(function (element) {
      return new EyesWebElement(element, this, this._logger);
    });
  }


  /** @override */
  getTitle() {
    return this._driver.getTitle();
  }


}

module.exports = EyesWebDriver;
