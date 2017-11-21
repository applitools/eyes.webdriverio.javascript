'use strict';

const {CheckSettings, Region} = require('eyes.sdk');


class WebdriverioCheckSettings extends CheckSettings {


  /**
   *
   * @param {Region} [region]
   * @param {int|String} [frame]
   */
  constructor(region, frame) {
    super();

    this._targetSelector = null;

    if (region) {
      this.region(region);
    }

    if (frame) {
      this.frame(frame);
    }
  }


  /**
   *
   * @param {Region|string} region
   * @returns {WebdriverioCheckSettings}
   */
  region(region) {
    if (region instanceof Region) {
      super.updateTargetRegion(region);
    } else if (typeof region === 'string') {
      this._targetSelector = region;
    } else {
      throw new TypeError("region method called with argument of unknown type!");
    }
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


  get targetSelector() {
    return this._targetSelector;
  }

}

module.exports = WebdriverioCheckSettings;
