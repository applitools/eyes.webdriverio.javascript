'use strict';

const {CheckSettings, Region, TypeUtils} = require('@applitools/eyes-sdk-core');
const {By} = require('selenium-webdriver');
const WebElement = require('../wrappers/WebElement');
const FrameLocator = require('./FrameLocator');
const IgnoreRegionBySelector = require('./IgnoreRegionBySelector');
const IgnoreRegionByElement = require('./IgnoreRegionByElement');
const FloatingRegionBySelector = require('./FloatingRegionBySelector');
const FloatingRegionByElement = require('./FloatingRegionByElement');

const USE_DEFAULT_MATCH_TIMEOUT = -1;

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

    /** @type {Map<string, string>} */ this._scriptHooks = new Map();
  }


  /**
   *
   * @param {Region|By|WebElement} region
   * @returns {WebdriverioCheckSettings}
   */
  region(region) {
    if (Region.isRegionCompatible(region)) {
      super.updateTargetRegion(region);
    } else if (region instanceof By) {
      this._targetSelector = region;
    } else if (region instanceof WebElement) {
      this._targetElement = region;
    } else if (TypeUtils.isString(region)) {
      this._targetSelector = By.cssSelector(region);
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
    if (TypeUtils.isInteger(frame)) {
      fl.setFrameIndex(frame);
    } else if (TypeUtils.isString(frame)) {
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

  // noinspection JSCheckFunctionSignatures
  /**
   * Adds a region to ignore.
   *
   * @override
   * @param {GetRegion|Region|By|WebElement|EyesWebElement} regionOrContainer The region or region container to ignore when validating the screenshot.
   * @return {WebdriverioCheckSettings} This instance of the settings object.
   */
  ignore(regionOrContainer) {
    if (regionOrContainer instanceof By) {
      this._ignoreRegions.push(new IgnoreRegionBySelector(regionOrContainer));
    } else if (regionOrContainer instanceof WebElement) {
      this._ignoreRegions.push(new IgnoreRegionByElement(regionOrContainer));
    } else {
      super.ignoreRegions(regionOrContainer);
    }

    return this;
  }


  // noinspection JSCheckFunctionSignatures
  /**
   * Adds one or more ignore regions.
   *
   * @override
   * @param {(GetRegion|Region|By|WebElement|EyesWebElement)...} regionsOrContainers One or more regions or region containers to ignore when validating the screenshot.
   * @return {WebdriverioCheckSettings} This instance of the settings object.
   */
  ignores(...regionsOrContainers) {
    super.ignoreRegions(...regionsOrContainers);
    return this;
  }


  // noinspection JSCheckFunctionSignatures
  /**
   * Adds a floating region. A floating region is a a region that can be placed within the boundaries of a bigger region.
   *
   * @override
   * @param {GetFloatingRegion|Region|FloatingMatchSettings|By|WebElement|EyesWebElement} regionOrContainer The content rectangle or region container
   * @param {int} [maxUpOffset] How much the content can move up.
   * @param {int} [maxDownOffset] How much the content can move down.
   * @param {int} [maxLeftOffset] How much the content can move to the left.
   * @param {int} [maxRightOffset] How much the content can move to the right.
   * @return {WebdriverioCheckSettings} This instance of the settings object.
   */
  floating(regionOrContainer, maxUpOffset, maxDownOffset, maxLeftOffset, maxRightOffset) {
    if (regionOrContainer instanceof By) {
      this._floatingRegions.push(new FloatingRegionBySelector(regionOrContainer, maxUpOffset, maxDownOffset, maxLeftOffset, maxRightOffset));
    } else if (regionOrContainer instanceof WebElement) {
      this._floatingRegions.push(new FloatingRegionByElement(regionOrContainer, maxUpOffset, maxDownOffset, maxLeftOffset, maxRightOffset));
    } else {
      super.floatingRegion(regionOrContainer, maxUpOffset, maxDownOffset, maxLeftOffset, maxRightOffset);
    }
    return this;
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * Adds a floating region. A floating region is a a region that can be placed within the boundaries of a bigger region.
   *
   * @override
   * @param {int} maxOffset How much each of the content rectangles can move in any direction.
   * @param {(GetFloatingRegion|Region|By|WebElement|EyesWebElement)...} regionsOrContainers One or more content rectangles or region containers
   * @return {WebdriverioCheckSettings} This instance of the settings object.
   */
  floatings(maxOffset, ...regionsOrContainers) {
    super.floatings(maxOffset, ...regionsOrContainers);
    return this;
  }

  /**
   *
   * @param [timeoutMilliseconds]
   * @returns {WebdriverioCheckSettings}
   */
  timeout(timeoutMilliseconds = USE_DEFAULT_MATCH_TIMEOUT) {
    super.timeout(timeoutMilliseconds);
    return this;
  }


  /**
   * Defines that the screenshot will contain the entire element or region, even if it's outside the view.
   *
   * @override
   * @param {boolean} [fully]
   * @return {WebdriverioCheckSettings} This instance of the settings object.
   */
  fully(fully) {
    super.fully(fully);
    return this;
  }


  /**
   * @override
   * @param {Boolean} [stitchContent=true]
   * @return {WebdriverioCheckSettings}
   */
  stitchContent(stitchContent = true) {
    super.stitchContent(stitchContent);
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
  getFrameChain() {
    return this._frameChain;
  }

  /**
   * @return {string}
   */
  getSizeMode() {
    if (!this._targetRegion && !this._targetElement && !this._targetSelector) {
      if (this.getStitchContent()) {
        return 'full-page';
      }
      return 'viewport';
    } if (this._targetRegion) {
      if (this.getStitchContent()) {
        return 'region';
      }
      return 'region';
    }
    if (this.getStitchContent()) {
      return 'selector';
    }
    return 'selector';
  }

  /**
   * @param {string} script
   */
  addScriptHook(script) {
    let scripts = this._scriptHooks.get(BEFORE_CAPTURE_SCREENSHOT);
    if (scripts == null) {
      scripts = [];
      this._scriptHooks.set(BEFORE_CAPTURE_SCREENSHOT, scripts);
    }
    scripts.add(script);
  }

  /**
   * @return {Map<string, string>}
   */
  getScriptHooks() {
    return this._scriptHooks;
  }

}

module.exports = WebdriverioCheckSettings;
