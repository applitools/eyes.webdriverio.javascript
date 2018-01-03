'use strict';

const {GetFloatingRegion, FloatingMatchSettings} = require('eyes.sdk');

class FloatingRegionByElement extends GetFloatingRegion {

  /**
   * @param {WebElement} webElement
   * @param {int} maxUpOffset
   * @param {int} maxDownOffset
   * @param {int} maxLeftOffset
   * @param {int} maxRightOffset
   */
  constructor(webElement, maxUpOffset, maxDownOffset, maxLeftOffset, maxRightOffset) {
    super();
    this._element = webElement;
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
    const point = await this._element.getLocation();
    const size = await this._element.getSize();
    return new FloatingMatchSettings(
      Math.ceil(point.getX()), Math.ceil(point.getY()), size.getWidth(), size.getHeight(),
      this._maxUpOffset, this._maxDownOffset, this._maxLeftOffset, this._maxRightOffset
    );
  }
}

module.exports = FloatingRegionByElement;
