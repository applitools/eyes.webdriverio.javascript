const EyesUtils = require('eyes.utils');
const GeometryUtils = EyesUtils.GeometryUtils;


class Target {

  /**
   * @typedef {{left: number, top: number, width: number, height: number}} Region
   * @typedef {{left: number, top: number, width: number, height: number,
     *            maxLeftOffset: number, maxRightOffset: number, maxUpOffset: number, maxDownOffset: number}} FloatingRegion
   * @typedef {{element: webdriver.WebElement|EyesRemoteWebElement|webdriver.By,
     *            maxLeftOffset: number, maxRightOffset: number, maxUpOffset: number, maxDownOffset: number}} FloatingElement
   */

  /**
   * @constructor
   **/
  constructor(region, frame) {
    this._region = region;
    this._frame = frame;

    this._timeout = null;
    this._stitchContent = false;
    this._ignoreMismatch = false;
    this._matchLevel = null;
    this._ignoreCaret = null;
    this._ignoreRegions = [];
    this._floatingRegions = [];

    this._ignoreObjects = [];
    this._floatingObjects = [];
  }

  /**
   * @param {int} ms Milliseconds to wait
   * @return {Target}
   */
  timeout(ms) {
    this._timeout = ms;
    return this;
  };

  /**
   * @param {boolean} [stitchContent=true]
   * @return {Target}
   */
  fully(stitchContent) {
    if (stitchContent !== false) {
      stitchContent = true;
    }

    this._stitchContent = stitchContent;
    return this;
  };

  //noinspection JSUnusedGlobalSymbols
  /**
   * @param {boolean} [ignoreMismatch=true]
   * @return {Target}
   */
  ignoreMismatch(ignoreMismatch) {
    if (ignoreMismatch !== false) {
      ignoreMismatch = true;
    }

    this._ignoreMismatch = ignoreMismatch;
    return this;
  };

  /**
   * @param {MatchLevel} matchLevel
   * @return {Target}
   */
  matchLevel(matchLevel) {
    this._matchLevel = matchLevel;
    return this;
  };

  /**
   * @param {boolean} [ignoreCaret=true]
   * @return {Target}
   */
  ignoreCaret(ignoreCaret) {
    if (ignoreCaret !== false) {
      ignoreCaret = true;
    }

    this._ignoreCaret = ignoreCaret;
    return this;
  };

  /**
   * @param {...(Region|webdriver.WebElement|EyesRemoteWebElement|webdriver.By|
     *          {element: (webdriver.WebElement|EyesRemoteWebElement|webdriver.By)})} ignoreRegion
   * @return {Target}
   */
  ignore(ignoreRegion) {
    let i = 0;
    const l = arguments.length;
    for (; i < l; i++) {
      if (!arguments[i]) {
        throw new Error("Ignore region can't be null or empty.");
      }

      if (GeometryUtils.isRegion(arguments[i])) {
        this._ignoreRegions.push(arguments[i]);
      } else if (arguments[i].constructor.name === "Object" && "element" in arguments[i]) {
        this._ignoreObjects.push(arguments[i]);
      } else {
        this._ignoreObjects.push({element: arguments[i]});
      }
    }
    return this;
  };

  /**
   * @param {...(FloatingRegion|FloatingElement)} floatingRegion
   * @return {Target}
   */
  floating(floatingRegion) {
    let i = 0;
    const l = arguments.length;
    for (; i < l; i++) {
      if (!arguments[i]) {
        throw new Error("Floating region can't be null or empty.");
      }

      if (GeometryUtils.isRegion(arguments[i]) &&
        "maxLeftOffset" in arguments[i] && "maxRightOffset" in arguments[i] && "maxUpOffset" in arguments[i] && "maxDownOffset" in arguments[i]) {
        this._floatingRegions.push(arguments[i]);
      } else {
        this._floatingObjects.push(arguments[i]);
      }
    }
    return this;
  };

  /**
   * @returns {Region|webdriver.WebElement|EyesRemoteWebElement|webdriver.By|null}
   */
  getRegion() {
    return this._region;
  };

  /**
   * @returns {boolean}
   */
  isUsingRegion() {
    return !!this._region;
  };

  /**
   * @returns {webdriver.WebElement|EyesRemoteWebElement|String|null}
   */
  getFrame() {
    return this._frame;
  };

  /**
   * @returns {boolean}
   */
  isUsingFrame() {
    return !!this._frame;
  };

  /**
   * @returns {int|null}
   */
  getTimeout() {
    return this._timeout;
  };

  /**
   * @returns {boolean}
   */
  getStitchContent() {
    return this._stitchContent;
  };

  /**
   * @returns {boolean}
   */
  getIgnoreMismatch() {
    return this._ignoreMismatch;
  };

  /**
   * @returns {boolean}
   */
  getMatchLevel() {
    return this._matchLevel;
  };

  /**
   * @returns {boolean|null}
   */
  getIgnoreCaret() {
    return this._ignoreCaret;
  };

  /**
   * @returns {Region[]}
   */
  getIgnoreRegions() {
    return this._ignoreRegions;
  };

  /**
   * @returns {{element: (webdriver.WebElement|EyesRemoteWebElement|webdriver.By)}[]}
   */
  getIgnoreObjects() {
    return this._ignoreObjects;
  };

  /**
   * @returns {FloatingRegion[]}
   */
  getFloatingRegions() {
    return this._floatingRegions;
  };

  /**
   * @returns {FloatingElement[]}
   */
  getFloatingObjects() {
    return this._floatingObjects;
  };

  /**
   * Validate current window
   *
   * @return {Target}
   * @constructor
   */
  static window() {
    return new Target();
  };

  /**
   * Validate region (in current window or frame) using region's rect, element or element's locator
   *
   * @param {Region|webdriver.WebElement|EyesRemoteWebElement|webdriver.By} region The region to validate.
   * @param {webdriver.WebElement|EyesRemoteWebElement|String} [frame] The element which is the frame to switch to.
   * @return {Target}
   * @constructor
   */
  region(region, frame) {
    return new Target(region, frame);
  };

  /**
   * Validate frame
   *
   * @param {EyesRemoteWebElement|webdriver.WebElement|String} frame The element which is the frame to switch to.
   * @return {Target}
   * @constructor
   */
  frame(frame) {
    return new Target(null, frame);
  };

}

module.exports = Target;

