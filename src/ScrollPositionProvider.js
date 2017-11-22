'use strict';

const EyesUtils = require('eyes.utils');
const EyesSDK = require('eyes.sdk');
const EyesWDIOUtils = require('./EyesWDIOUtils');
const PositionProvider = EyesSDK.PositionProvider,
  ArgumentGuard = EyesUtils.ArgumentGuard;


class ScrollPositionProvider extends PositionProvider {


  /**
   * @constructor
   * @param {Logger} logger A Logger instance.
   * @param {EyesWebDriver} executor
   * @param {PromiseFactory} promiseFactory
   * @augments PositionProvider
   */
  constructor(logger, executor, promiseFactory) {
    super();

    ArgumentGuard.notNull(logger, "logger");
    ArgumentGuard.notNull(executor, "executor");

    this._logger = logger;
    this._driver = executor;
    this._promiseFactory = promiseFactory;
  }


  /**
   * @returns {Promise<{x: number, y: number}>} The scroll position of the current frame.
   */
  getCurrentPosition () {
    const that = this;
    that._logger.verbose("getCurrentScrollPosition()");
    return EyesWDIOUtils.getCurrentScrollPosition(this._driver, this._promiseFactory).then(function (result) {
      that._logger.verbose("Current position: ", result);
      return result;
    });
  }

  /**
   * Go to the specified location.
   * @param {{x: number, y: number}} location The position to scroll to.
   * @returns {Promise<void>}
   */
  setPosition (location) {
    const that = this;
    that._logger.verbose("Scrolling to:", location);
    return EyesWDIOUtils.scrollTo(this._driver, location, this._promiseFactory).then(function () {
      that._logger.verbose("Done scrolling!");
    });
  }

  /**
   * @returns {Promise<{width: number, height: number}>} The entire size of the container which the position is relative to.
   */
  getEntireSize () {
    const that = this;
    return EyesWDIOUtils.getEntirePageSize(this._driver, this._promiseFactory).then(function (result) {
      that._logger.verbose("Entire size: ", result);
      return result;
    });
  }

  /**
   * @returns {Promise<{x: number, y: number}>}
   */
  getState () {
    return this.getCurrentPosition();
  }

  /**
   * @param {{x: number, y: number}} state The initial state of position
   * @returns {Promise<void>}
   */
  restoreState (state) {
    const that = this;
    return this.setPosition(state).then(function () {
      that._logger.verbose("Position restored.");
    });
  }

}

module.exports = ScrollPositionProvider;
