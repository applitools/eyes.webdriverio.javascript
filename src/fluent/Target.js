'use strict';

const WebdriverioCheckSettings = require('./WebdriverioCheckSettings');

class Target {

  /**
   * Validate current window
   *
   * @return {WebdriverioCheckSettings}
   * @constructor
   */
  static window() {
    return new WebdriverioCheckSettings();
  }

  /**
   * Validate region (in current window or frame) using region's rect, element or element's locator
   *
   * @param {Region|RegionObject|By|WebElement|EyesWebElement} region The region to validate.
   * @param {Integer|String|By|WebElement|EyesWebElement} [frame] The element which is the frame to switch to.
   * @return {WebdriverioCheckSettings}
   * @constructor
   */
  static region(region, frame) {
    return new WebdriverioCheckSettings(region, frame);
  }

  /**
   * Validate frame
   *
   * @param {Integer|String|By|WebElement|EyesWebElement} frame The element which is the frame to switch to.
   * @return {WebdriverioCheckSettings}
   * @constructor
   */
  static frame(frame) {
    return new WebdriverioCheckSettings(null, frame);
  }
}

module.exports = Target;
