'use strict';

const {EyesScreenshotFactory} = require('@applitools/eyes.sdk.core');

const EyesWebDriverScreenshot = require('./EyesWDIOScreenshot');

/**
 * Encapsulates the instantiation of an {@link EyesWebDriverScreenshot} .
 */
class EyesWebDriverScreenshotFactory extends EyesScreenshotFactory {

  /**
   * @param {Logger} logger
   * @param {EyesWebDriver} driver
   * @param {PromiseFactory} promiseFactory
   */
  constructor(logger, driver, promiseFactory) {
    super();

    this._logger = logger;
    this._executor = driver;
    this._promiseFactory = promiseFactory;
  }

  /**
   * @override
   * @inheritDoc
   */
  makeScreenshot(image) {
    const result = new EyesWebDriverScreenshot(this._logger, this._executor, image, this._promiseFactory);
    return result.init();
  }
}

module.exports = EyesWebDriverScreenshotFactory;
