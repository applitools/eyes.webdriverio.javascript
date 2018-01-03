'use strict';

const {GetRegion, Region} = require('eyes.sdk');

class IgnoreRegionByElement extends GetRegion {

  /**
   * @param {WebElement} webElement
   */
  constructor(webElement) {
    super();
    this._element = webElement;
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @override
   * @param {Eyes} eyesBase
   */
  async getRegion(eyesBase) {
    const point = await this._element.getLocation();
    const size = await this._element.getSize();
    return new Region(Math.ceil(point.getX()), Math.ceil(point.getY()), size.getWidth(), size.getHeight());
  }
}

module.exports = IgnoreRegionByElement;
