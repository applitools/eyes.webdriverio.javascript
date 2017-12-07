'use strict';

const {CheckSettings, GeneralUtils, Region} = require('eyes.sdk');
const By = require('../By');
const WebElement = require('../wrappers/WebElement');
const FrameLocator = require('./FrameLocator');


class WebdriverioCheckSettings extends CheckSettings {


  /**
   *
   * @param {Region|By|WebElement|EyesWebElement} [region]
   * @param {int|String|By} [frame]
   */
  constructor(region, frame) {
    super();

    /** @type {By} */
    this._targetSelector = null;
    /** @type {WebElement} */
    this._targetElement = null;
    this._frameChain = [];

    if (region) {
      this.region(region);
    }

    if (frame) {
      this.frame(frame);
    }
  }


  /**
   *
   * @param {Region|By} region
   * @returns {WebdriverioCheckSettings}
   */
  region(region) {
    if (region instanceof Region) {
      super.updateTargetRegion(region);
    } else if (region instanceof By) {
      this._targetSelector = region;
    } else if (region instanceof WebElement) {
      this._targetElement = region;
    } else {
      throw new TypeError("region method called with argument of unknown type!");
    }
    return this;
  }

  /**
   * @param {Integer|String|By|WebElement|EyesWebElement} frame The frame to switch to.
   * @returns {WebdriverioCheckSettings}
   */
  frame(frame) {
    const fl = new FrameLocator();
    // noinspection IfStatementWithTooManyBranchesJS
    if (Number.isInteger(frame)) {
      fl.setFrameIndex(frame);
    } else if (GeneralUtils.isString(frame)) {
      fl.setFrameNameOrId(frame);
    } else if (frame instanceof By) {
      fl.setFrameSelector(frame);
    } else if (frame instanceof WebElement) {
      fl.setFrameElement(frame);
    } else {
      throw new TypeError("frame method called with argument of unknown type!");
    }
    this._frameChain.push(fl);
    return this;
  }

  /**
   *
   * @param timeoutMilliseconds
   * @returns {WebdriverioCheckSettings}
   */
  timeout(timeoutMilliseconds) {
    super.timeout(timeoutMilliseconds);
    return this;
  }


  /**
   * @returns {By}
   */
  get targetSelector() {
    return this._targetSelector;
  }

  /**
   * @returns {WebElement}
   */
  get targetElement() {
    return this._targetElement;
  }

  /**
   * @returns {FrameLocator[]}
   */
  get frameChain() {
    return this._frameChain;
  }

}

module.exports = WebdriverioCheckSettings;
