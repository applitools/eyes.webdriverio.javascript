'use strict';

const {CheckSettings, Region} = require('eyes.sdk');
const By = require('./By');


class WebdriverioCheckSettings extends CheckSettings {


  /**
   *
   * @param {Region|By} [region]
   * @param {int|String|By} [frame]
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
   * @param {Region|By} region
   * @returns {WebdriverioCheckSettings}
   */
  region(region) {
    if (region instanceof Region) {
      super.updateTargetRegion(region);
    } else if (region instanceof By) {
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
