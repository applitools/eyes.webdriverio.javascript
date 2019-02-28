'use strict';

const {EyesScreenshotFactory} = require('@applitools/eyes-sdk-core');

const EyesWebDriverScreenshot = require('./EyesWDIOScreenshot');

/**
 * Encapsulates the instantiation of an {@link EyesWebDriverScreenshot} .
 */
class EyesWDIOScreenshotFactory extends EyesScreenshotFactory {

  /**
   * @param {Logger} logger
   * @param {EyesWebDriver} driver
   */
  constructor(logger, driver) {
    super();

    this._logger = logger;
    this._executor = driver;
  }

  /**
   * @override
   * @inheritDoc
   */
  makeScreenshot(image) {
    const result = new EyesWebDriverScreenshot(this._logger, this._executor, image);
    return result.init();
  }
}

module.exports = EyesWDIOScreenshotFactory;
