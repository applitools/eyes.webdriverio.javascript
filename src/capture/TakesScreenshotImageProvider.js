'use strict';

const {ImageProvider, MutableImage} = require('@applitools/eyes.sdk.core');

/**
 * An image provider based on WebDriver's interface.
 */
class TakesScreenshotImageProvider extends ImageProvider {

  /**
   * @param {Logger} logger A Logger instance.
   * @param {EyesWebDriver} tsInstance
   */
  constructor(logger, tsInstance) {
    super();

    this._logger = logger;
    this._tsInstance = tsInstance;
  }

  /**
   * @override
   * @return {Promise.<MutableImage>}
   */
  getImage() {
    this._logger.verbose("Getting screenshot as base64...");

    const that = this;
    return this._tsInstance.remoteWebDriver.takeScreenshot().then(screenshot64 => {
      that._logger.verbose("Done getting base64! Creating MutableImage...");
      return new MutableImage(screenshot64, that._tsInstance.getPromiseFactory());
    });
  }
}

module.exports = TakesScreenshotImageProvider;
