'use strict';

const {PositionProvider, ArgumentGuard} = require('@applitools/eyes.sdk.core');

const EyesWDIOUtils = require('../EyesWDIOUtils');
const CssTranslatePositionMemento = require('./CssTranslatePositionMemento');

/**
 * A {@link PositionProvider} which is based on CSS translates. This is
 * useful when we want to stitch a page which contains fixed position elements.
 */
class CssTranslatePositionProvider extends PositionProvider {

  /**
   * @param {Logger} logger A Logger instance.
   * @param {EyesJsExecutor} executor
   */
  constructor(logger, executor) {
    ArgumentGuard.notNull(logger, "logger");
    ArgumentGuard.notNull(executor, "executor");
    super();

    this._logger = logger;
    this._executor = executor;
    this._lastSetPosition = undefined;

    this._logger.verbose("creating CssTranslatePositionProvider");
  }

  /**
   * @override
   * @inheritDoc
   */
  getCurrentPosition() {
    this._logger.verbose("position to return: ", this._lastSetPosition);
    return this._executor.getPromiseFactory().resolve(this._lastSetPosition);
  }

  /**
   * @override
   * @inheritDoc
   */
  setPosition(location) {
    ArgumentGuard.notNull(location, "location");

    const that = this;
    this._logger.verbose(`CssTranslatePositionProvider - Setting position to: ${location}`);
    return EyesWDIOUtils.translateTo(this._executor, location).then(() => {
      that._logger.verbose("Done!");
      that._lastSetPosition = location;
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  getEntireSize() {
    const that = this;
    return EyesWDIOUtils.getCurrentFrameContentEntireSize(this._executor).then(entireSize => {
      that._logger.verbose(`CssTranslatePositionProvider - Entire size: ${entireSize}`);
      return entireSize;
    });
  }

  /**
   * @override
   * @return {Promise.<CssTranslatePositionMemento>}
   */
  getState() {
    const that = this;
    return EyesWDIOUtils.getCurrentTransform(this._executor).then(transforms => {
      that._logger.verbose("Current transform", transforms);
      return new CssTranslatePositionMemento(transforms, that._lastSetPosition);
    });
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @override
   * @param {CssTranslatePositionMemento} state The initial state of position
   * @return {Promise}
   */
  restoreState(state) {
    const that = this;
    return EyesWDIOUtils.setTransforms(this._executor, state.transform).then(() => {
      that._logger.verbose("Transform (position) restored.");
      that._lastSetPosition = state.position;
    });
  }
}

module.exports = CssTranslatePositionProvider;