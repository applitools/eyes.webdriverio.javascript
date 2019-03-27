'use strict';

const {EyesJsExecutor} = require('@applitools/eyes-sdk-core');

class WDIOJSExecutor extends EyesJsExecutor {

  /**
   * @param {EyesWebDriver} driver
   */
  constructor(driver) {
    super();

    /** @type {EyesWebDriver} */
    this._driver = driver;
  }

  /**
   * @override
   * @inheritDoc
   */
  async executeScript(script, ...varArgs) {
    try {
      const result = await this._driver.remoteWebDriver.execute(script, ...varArgs);
      this._driver.eyes._logger.verbose('Done!');
      return result;
    } catch (e) {
      this._driver.eyes._logger.verbose(`Error executeScript: ${script}\nargs: ${JSON.stringify(varArgs)}`);
      throw e;
    }
  }

  /** @override */
  async executeAsyncScript(script, ...varArgs) {
    try {
      const result = await this._driver.remoteWebDriver.executeAsync(script, ...varArgs);
      this._driver.eyes._logger.verbose('Done!');
      return result;
    } catch (e) {
      this._driver.eyes._logger.verbose("WARNING: execute script error: " + e);
      throw e;
    }
  }

  /**
   * @override
   * @inheritDoc
   */
  sleep(millis) { // todo
    return this._driver.sleep(millis);
  }
}

module.exports = WDIOJSExecutor;
