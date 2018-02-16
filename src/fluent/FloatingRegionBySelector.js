'use strict';

const {GetFloatingRegion, FloatingMatchSettings, Location, CoordinatesType} = require('@applitools/eyes.sdk.core');

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
   * @param {EyesScreenshot} screenshot
   */
  async getRegion(eyesBase, screenshot) {
    const element = await eyesBase.getDriver().findElement(this._element);
    const point = await element.getLocation();
    const location = new Location(point);
    const size = await element.getSize();
    const lTag = screenshot.convertLocation(location, CoordinatesType.CONTEXT_RELATIVE, CoordinatesType.SCREENSHOT_AS_IS);
    return new FloatingMatchSettings(lTag.getX(), lTag.getY(), size.getWidth(), size.getHeight(), this._maxUpOffset, this._maxDownOffset, this._maxLeftOffset, this._maxRightOffset);
  }
}

module.exports = FloatingRegionBySelector;
