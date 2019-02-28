'use strict';

const {GetFloatingRegion, FloatingMatchSettings, Location, CoordinatesType} = require('@applitools/eyes-sdk-core');

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
  getRegion(eyesBase, screenshot) {
    const that = this;
    return eyesBase.getDriver().findElement(that._element).then(element => {
      let location;
      return element.getLocation().then(point => {
        location = new Location(point);
        return element.getSize();
      }).then(size => {
        const lTag = screenshot.convertLocation(location, CoordinatesType.CONTEXT_RELATIVE, CoordinatesType.SCREENSHOT_AS_IS);
        return new FloatingMatchSettings({
          left: lTag.getX(),
          top: lTag.getY(),
          width: size.getWidth(),
          height: size.getHeight(),
          maxUpOffset: that._maxUpOffset,
          maxDownOffset: that._maxDownOffset,
          maxLeftOffset: that._maxLeftOffset,
          maxRightOffset: that._maxRightOffset
        });
      });
    });
  }
}

module.exports = FloatingRegionBySelector;
