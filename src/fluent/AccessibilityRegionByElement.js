'use strict';

const {GetAccessibilityRegion, AccessibilityMatchSettings, Location, CoordinatesType} = require('@applitools/eyes-sdk-core');

class AccessibilityRegionByElement extends GetAccessibilityRegion {

  /**
   * @param {WebElement} webElement
   * @param {AccessibilityRegionType} regionType
   */
  constructor(webElement, regionType) {
    super();
    this._element = webElement;
    this._regionType = regionType;
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @inheritDoc
   * @param {Eyes} eyes
   * @param {EyesScreenshot} screenshot
   * @return {Promise<AccessibilityMatchSettings[]>}
   */
  async getRegion(eyes, screenshot) {
    const point = await this._element.getLocation();
    const size = await this._element.getSize();
    const pTag = screenshot.convertLocation(
      new Location(point),
      CoordinatesType.CONTEXT_RELATIVE,
      CoordinatesType.SCREENSHOT_AS_IS
    );

    const accessibilityRegion = new AccessibilityMatchSettings({
      left: pTag.getX(),
      top: pTag.getY(),
      width: size.getWidth(),
      height: size.getHeight(),
      type: this._regionType,
    });
    return [accessibilityRegion];
  }
}

module.exports = AccessibilityRegionByElement;
