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
  getRegion(eyesBase, screenshot) {
    const that = this;
    return that._element.getLocation().then(point => {
      return that._element.getSize().then(size => {
        const lTag = screenshot.convertLocation(new Location(point), CoordinatesType.CONTEXT_RELATIVE, CoordinatesType.SCREENSHOT_AS_IS);
        return new Region(lTag.getX(), lTag.getY(), size.width, size.height);
      });
    });
  }
}

module.exports = IgnoreRegionByElement;
