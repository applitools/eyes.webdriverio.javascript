'use strict';

const {ArgumentGuard, EyesJsExecutor} = require('@applitools/eyes-sdk-core');

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
  executeScript(script, ...args) {
    const that = this;
    return Promise.resolve(that._driver.remoteWebDriver.execute(script, ...args)).catch(e => {
      that._driver.eyes._logger.verbose(`Error executeScript: ${script}\nargs: ${JSON.stringify(args)}`);
      throw e;
    });
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
