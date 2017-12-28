'use strict';

const {GetRegion, Region} = require('eyes.sdk');

class IgnoreRegionBySelector extends GetRegion {

  /**
   * @param {By} regionSelector
   */
  constructor(regionSelector) {
    super();
    this._element = regionSelector;
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @override
   * @param {Eyes} eyesBase
   */
  async getRegion(eyesBase) {
    const element = await eyesBase.getDriver().findElement(this._element);
    const point = await element.getLocation();
    const size = await element.getSize();
    return new Region(Math.ceil(point.getX()), Math.ceil(point.getY()), size.getWidth(), size.getHeight());
  }
}

module.exports = IgnoreRegionBySelector;
