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
    super();
    ArgumentGuard.notNull(logger, "logger");
    ArgumentGuard.notNull(executor, "executor");

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
  async setPosition(location) {
    ArgumentGuard.notNull(location, "location");

    this._logger.verbose(`CssTranslatePositionProvider - Setting position to: ${location}`);
    await EyesWDIOUtils.translateTo(this._executor, location);
    this._logger.verbose("Done!");
    this._lastSetPosition = location;
  }

  /**
   * @override
   * @inheritDoc
   */
  async getEntireSize() {
    const entireSize = await EyesWDIOUtils.getCurrentFrameContentEntireSize(this._executor);
    this._logger.verbose(`CssTranslatePositionProvider - Entire size: ${entireSize}`);
    return entireSize;
  }

  /**
   * @override
   * @return {Promise.<CssTranslatePositionMemento>}
   */
  async getState() {
    const transforms = await EyesWDIOUtils.getCurrentTransform(this._executor);
    this._logger.verbose("Current transform", transforms);
    return new CssTranslatePositionMemento(transforms, this._lastSetPosition);
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @override
   * @param {CssTranslatePositionMemento} state The initial state of position
   * @return {Promise}
   */
  async restoreState(state) {
    await EyesWDIOUtils.setTransforms(this._executor, state.transform);
    this._logger.verbose("Transform (position) restored.");
    this._lastSetPosition = state.position;
  }
}

module.exports = CssTranslatePositionProvider;