'use strict';

const {EyesJsExecutor} = require('eyes.sdk');

class WDIOJSExecutor extends EyesJsExecutor {

  /**
   * @param {EyesWebDriver} driver
   */
  constructor(driver) {
    super();

    /** @type {EyesWebDriver} */
    this._executor = driver;
  }

  /**
   * @override
   * @inheritDoc
   */
  async executeScript(script, ...args) {
    try {
      return await this._executor.remoteWebDriver.execute(script, args);
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * @override
   * @inheritDoc
   */
  sleep(millis) { // todo
    return this._executor.remoteWebDriver.sleep(millis);
  }


  /**
   * @return {PromiseFactory}
   */
  getPromiseFactory() {
    return this._executor.getPromiseFactory();
  }
}

module.exports = WDIOJSExecutor;
