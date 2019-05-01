'use strict';

const {ArgumentGuard} = require('@applitools/eyes-sdk-core');

const TargetLocator = require('../TargetLocator');

/**
 * Wraps a target locator so we can keep track of which frames have been switched to.
 */
class EyesNullTargetLocator extends TargetLocator {

  /**
   * Initialized a new EyesNullTargetLocator object.
   *
   * @param {Logger} logger A Logger instance.
   * @param {EyesWebDriver} driver The WebDriver from which the targetLocator was received.
   */
  constructor(logger, driver) {
    ArgumentGuard.notNull(logger, "logger");
    ArgumentGuard.notNull(driver, "driver");

    super(driver.webDriver);

    this._logger = logger;
  }

  async frame(arg1) {
    return null;
  }


  parentFrame() {
    return null;
  }

  async framesDoScroll() {
    return null;
  }

  async frames() {
    return null;
  }

  async window() {
    return null;
  }

  async defaultContent() {
    return null;
  }

  async activeElement() {
    return null;
  }

  async alert() {
    return null;
  }

  async willSwitchToFrame() {
    return null;
  }
}

module.exports = EyesNullTargetLocator;
