'use strict';

const {ArgumentGuard, EyesJsExecutor} = require('@applitools/eyes.sdk.core');

class WDIOJSExecutor extends EyesJsExecutor {

  /**
   * @param {EyesWebDriver} driver
   * @param {PromiseFactory} [promiseFactory]
   */
  constructor(driver, promiseFactory) {
    super();

    /** @type {EyesWebDriver} */
    this._driver = driver;

    if (!driver.getPromiseFactory()) {
      ArgumentGuard.notNull(promiseFactory, 'promiseFactory')
    }

    /** @type {PromiseFactory} */
    this._promiseFactory = promiseFactory || driver.getPromiseFactory();
  }

  /**
   * @override
   * @inheritDoc
   */
  executeScript(script, ...args) {
    return this._driver.remoteWebDriver.execute(script, args);
  }

  /**
   * @override
   * @inheritDoc
   */
  sleep(millis) { // todo
    return this._driver.sleep(millis);
  }


  /**
   * @return {PromiseFactory}
   */
  getPromiseFactory() {
    return this._driver.eyes.getPromiseFactory();
  }
}

module.exports = WDIOJSExecutor;
