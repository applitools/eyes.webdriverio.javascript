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
  getRegion(eyesBase, screenshot) {
    const that = this;
    return eyesBase.getDriver().findElement(that._element).then(element => {
      return element.getLocation().then(point => {
        return element.getSize().then(size => {
          const lTag = screenshot.convertLocation(new Location(point), CoordinatesType.CONTEXT_RELATIVE, CoordinatesType.SCREENSHOT_AS_IS);
          return new Region(lTag.getX(), lTag.getY(), size.getWidth(), size.getHeight());
        });
      });
    });
  }
}

module.exports = IgnoreRegionBySelector;
