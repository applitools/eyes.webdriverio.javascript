'use strict';

const {GetRegion, Region, Location, CoordinatesType} = require('@applitools/eyes.sdk.core');

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
   * @param {EyesScreenshot} screenshot
   */
  async getRegion(eyesBase, screenshot) {
    const element = await eyesBase.getDriver().findElement(this._element);
    const point = await element.getLocation();
    const size = await element.getSize();
    const lTag = screenshot.convertLocation(new Location(point), CoordinatesType.CONTEXT_RELATIVE, CoordinatesType.SCREENSHOT_AS_IS);
    return new Region(lTag.getX(), lTag.getY(), size.getWidth(), size.getHeight());
  }
}

module.exports = IgnoreRegionBySelector;
