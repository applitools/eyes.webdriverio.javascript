'use strict';

const {GetFloatingRegion, FloatingMatchSettings} = require('eyes.sdk');

class FloatingRegionBySelector extends GetFloatingRegion {

  /**
   * @param {By} regionSelector
   * @param {int} maxUpOffset
   * @param {int} maxDownOffset
   * @param {int} maxLeftOffset
   * @param {int} maxRightOffset
   */
  constructor(regionSelector, maxUpOffset, maxDownOffset, maxLeftOffset, maxRightOffset) {
    super();
    this._element = regionSelector;
    this._maxUpOffset = maxUpOffset;
    this._maxDownOffset = maxDownOffset;
    this._maxLeftOffset = maxLeftOffset;
    this._maxRightOffset = maxRightOffset;
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
    return new FloatingMatchSettings(
      Math.ceil(point.getX()), Math.ceil(point.getY()), size.getWidth(), size.getHeight(),
      this._maxUpOffset, this._maxDownOffset, this._maxLeftOffset, this._maxRightOffset
    );
  }
}

module.exports = FloatingRegionBySelector;
