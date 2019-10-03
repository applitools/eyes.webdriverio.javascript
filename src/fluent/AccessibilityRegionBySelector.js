'use strict';

const { GetAccessibilityRegion } = require('@applitools/eyes-sdk-core');

const { AccessibilityRegionByElement } = require('./AccessibilityRegionByElement');

/**
 * @ignore
 */
class AccessibilityRegionBySelector extends GetAccessibilityRegion {
  /**
   * @param {By} regionSelector
   * @param {AccessibilityRegionType} regionType
   */
  constructor(regionSelector, regionType) {
    super();
    this._selector = regionSelector;
    this._regionType = regionType;
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @inheritDoc
   * @param {Eyes} eyes
   * @param {EyesScreenshot} screenshot
   * @return {Promise<AccessibilityMatchSettings>}
   */
  async getRegion(eyes, screenshot) {
    const element = await eyes.getDriver().findElement(this._selector);
    return new AccessibilityRegionByElement(element, this._regionType).getRegion(eyes, screenshot);
  }
}

exports.AccessibilityRegionBySelector = AccessibilityRegionBySelector;
