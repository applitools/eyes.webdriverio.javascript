'use strict';

const EyesSDK = require('eyes.sdk'),
  EyesUtils = require('eyes.utils'),
  EyesWDIOUtils = require('./EyesWDIOUtils');
const PositionProvider = EyesSDK.PositionProvider,
  ArgumentGuard = EyesUtils.ArgumentGuard;


class CssTranslatePositionProvider extends PositionProvider {

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
    this._lastSetPosition = null;
  }


  /**
   * @returns {Promise<{x: number, y: number}>} The scroll position of the current frame.
   */
  getCurrentPosition() {
    const that = this;
    return that._promiseFactory.makePromise(function (resolve) {
      that._logger.verbose("getCurrentPosition()");
      that._logger.verbose("position to return: ", that._lastSetPosition);
      resolve(that._lastSetPosition);
    });
  }

  /**
   * Go to the specified location.
   * @param {{x: number, y: number}} location The position to scroll to.
   * @returns {Promise<void>}
   */
  setPosition(location) {
    const that = this;
    that._logger.verbose("Setting position to:", location);
    return EyesWDIOUtils.translateTo(this._driver, location, this._promiseFactory).then(function () {
      that._logger.verbose("Done!");
      that._lastSetPosition = location;
    });
  }

  /**
   * @returns {Promise<{width: number, height: number}>} The entire size of the container which the position is relative to.
   */
  getEntireSize() {
    const that = this;
    return EyesWDIOUtils.getEntirePageSize(this._driver, this._promiseFactory).then(function (result) {
      that._logger.verbose("Entire size: ", result);
      return result;
    });
  }

  /**
   * @returns {Promise<object.<string, string>>}
   */
  getState() {
    const that = this;
    return EyesWDIOUtils.getCurrentTransform(this._driver, this._promiseFactory).then(function (transforms) {
      that._logger.verbose("Current transform", transforms);
      return transforms;
    });
  }

  /**
   * @param {object.<string, string>} state The initial state of position
   * @returns {Promise<void>}
   */
  restoreState(state) {
    const that = this;
    return EyesWDIOUtils.setTransforms(this._driver, state, this._promiseFactory).then(function () {
      that._logger.verbose("Transform (position) restored.");
    });
  }

}

module.exports = CssTranslatePositionProvider;
