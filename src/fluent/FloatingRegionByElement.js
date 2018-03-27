'use strict';

const {GetFloatingRegion, FloatingMatchSettings, Location, CoordinatesType} = require('@applitools/eyes.sdk.core');

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
   * @param {EyesScreenshot} screenshot
   */
  getRegion(eyesBase, screenshot) {
    const that = this;
    return that._element.getLocation().then(point => {
      return that._element.getSize().then(size => {
        const lTag = screenshot.convertLocation(new Location(point), CoordinatesType.CONTEXT_RELATIVE, CoordinatesType.SCREENSHOT_AS_IS);
        return new FloatingMatchSettings(lTag.getX(), lTag.getY(), size.getWidth(), size.getHeight(), that._maxUpOffset, that._maxDownOffset, that._maxLeftOffset, that._maxRightOffset);
      });
    });
  }
}

module.exports = FloatingRegionByElement;
