'use strict';

const {GetRegion, Region, Location, CoordinatesType} = require('@applitools/eyes.sdk.core');

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
   * @param {EyesScreenshot} screenshot
   */
  async getRegion(eyesBase, screenshot) {
    const point = await this._element.getLocation();
    const size = await this._element.getSize();
    const lTag = screenshot.convertLocation(new Location(point), CoordinatesType.CONTEXT_RELATIVE, CoordinatesType.SCREENSHOT_AS_IS);
    return new Region(lTag.getX(), lTag.getY(), size.width, size.height);
  }
}

module.exports = IgnoreRegionByElement;
