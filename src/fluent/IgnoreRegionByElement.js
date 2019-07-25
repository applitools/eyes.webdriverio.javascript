'use strict';

const {GetRegion, Region, Location, CoordinatesType, GeneralUtils} = require('@applitools/eyes-sdk-core');

const EYES_SELECTOR_TAG = 'data-eyes-selector';

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

  // noinspection JSCheckFunctionSignatures
  /**
   * @inheritDoc
   * @param {Eyes} eyes
   * @return {Promise<string>}
   */
  async getSelector(eyes) {
    const randId = GeneralUtils.randomAlphanumeric();
    await eyes._driver.executeScript(`arguments[0].setAttribute('${EYES_SELECTOR_TAG}', '${randId}');`, this._element);
    return `[${EYES_SELECTOR_TAG}="${randId}"]`;
  }

}

module.exports = IgnoreRegionByElement;
