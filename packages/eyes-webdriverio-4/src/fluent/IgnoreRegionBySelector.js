'use strict';

const { GetRegion, CoordinatesType, Location, Region } = require('@applitools/eyes-sdk-core');

const {SelectorByLocator} = require('./SelectorByLocator');

class IgnoreRegionBySelector extends GetRegion {

  /**
   * @param {By} regionSelector
   */
  constructor(regionSelector) {
    super();
    this._selector = regionSelector;
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @override
   * @param {Eyes} eyes
   * @param {EyesScreenshot} screenshot
   */
  async getRegion(eyes, screenshot) {
    const elements = await eyes.getDriver().findElements(this._selector);

    const values = [];
    if (elements && elements.length > 0) {
      for (let i = 0; i < elements.length; i += 1) {
        const point = await elements[i].getLocation();
        const size = await elements[i].getSize();
        const lTag = screenshot.convertLocation(
          new Location(point),
          CoordinatesType.CONTEXT_RELATIVE,
          CoordinatesType.SCREENSHOT_AS_IS
        );
        values.push(new Region(lTag.getX(), lTag.getY(), size.getWidth(), size.getHeight()));
      }
    }

    return values;
  }

  /**
   * @inheritDoc
   * @param {Eyes} eyes
   * @return {Promise<string>}
   */
  async getSelector(eyes) {
    return new SelectorByLocator(this._selector).getSelector(eyes);
  }
}

module.exports = IgnoreRegionBySelector;
