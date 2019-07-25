'use strict';

const {GetRegion} = require('@applitools/eyes-sdk-core');

const { IgnoreRegionByElement } = require('./IgnoreRegionByElement');

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
   * @param {Eyes} eyes
   * @param {EyesScreenshot} screenshot
   */
  async getRegion(eyes, screenshot) {
    const element = await eyes.getDriver().findElement(this._element);
    return new IgnoreRegionByElement(element).getRegion(eyes, screenshot);
  }

  /**
   * @inheritDoc
   * @param {Eyes} eyes
   * @return {Promise<string>}
   */
  async getSelector(eyes) {
    const element = await eyes.getDriver().findElement(this._element);
    return new IgnoreRegionByElement(element).getSelector(eyes);
  }

}

module.exports = IgnoreRegionBySelector;
