(function () {
  'use strict';

  const EyesUtils = require('eyes.utils');
  const EyesSDK = require('eyes.sdk');
  const EyesWDIOUtils = require('./EyesWDIOUtils');
  const PositionProvider = EyesSDK.PositionProvider,
    ArgumentGuard = EyesUtils.ArgumentGuard;

  /**
   * @constructor
   * @param {Logger} logger A Logger instance.
   * @param {EyesWebDriver} executor
   * @param {PromiseFactory} promiseFactory
   * @augments PositionProvider
   */
  function ScrollPositionProvider(logger, executor, promiseFactory) {
    ArgumentGuard.notNull(logger, "logger");
    ArgumentGuard.notNull(executor, "executor");

    this._logger = logger;
    this._driver = executor;
    this._promiseFactory = promiseFactory;
  }

  ScrollPositionProvider.prototype = new PositionProvider();
  ScrollPositionProvider.prototype.constructor = ScrollPositionProvider;

  /**
   * @returns {Promise<{x: number, y: number}>} The scroll position of the current frame.
   */
  ScrollPositionProvider.prototype.getCurrentPosition = function () {
    const that = this;
    that._logger.verbose("getCurrentScrollPosition()");
    return EyesWDIOUtils.getCurrentScrollPosition(this._driver, this._promiseFactory).then(function (result) {
      that._logger.verbose("Current position: ", result);
      return result;
    });
  };

  /**
   * Go to the specified location.
   * @param {{x: number, y: number}} location The position to scroll to.
   * @returns {Promise<void>}
   */
  ScrollPositionProvider.prototype.setPosition = function (location) {
    const that = this;
    that._logger.verbose("Scrolling to:", location);
    return EyesWDIOUtils.scrollTo(this._driver, location, this._promiseFactory).then(function () {
      that._logger.verbose("Done scrolling!");
    });
  };

  /**
   * @returns {Promise<{width: number, height: number}>} The entire size of the container which the position is relative to.
   */
  ScrollPositionProvider.prototype.getEntireSize = function () {
    const that = this;
    return EyesWDIOUtils.getEntirePageSize(this._driver, this._promiseFactory).then(function (result) {
      that._logger.verbose("Entire size: ", result);
      return result;
    });
  };

  /**
   * @returns {Promise<{x: number, y: number}>}
   */
  ScrollPositionProvider.prototype.getState = function () {
    return this.getCurrentPosition();
  };

  /**
   * @param {{x: number, y: number}} state The initial state of position
   * @returns {Promise<void>}
   */
  ScrollPositionProvider.prototype.restoreState = function (state) {
    const that = this;
    return this.setPosition(state).then(function () {
      that._logger.verbose("Position restored.");
    });
  };

  module.exports = ScrollPositionProvider;
}());