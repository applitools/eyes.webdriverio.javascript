'use strict';

const {ArgumentGuard, PositionProvider, Location} = require('eyes.sdk.core');

const EyesWDIOUtils = require('../EyesWDIOUtils');
const ScrollPositionMemento = require('./ScrollPositionMemento');
const EyesDriverOperationError = require('./../errors/EyesDriverOperationError');

class ScrollPositionProvider extends PositionProvider {

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

    this._logger.verbose("creating ScrollPositionProvider");
  }

  /**
   * @override
   * @inheritDoc
   */
  async getCurrentPosition() {
    let result;
    try {
      this._logger.verbose("ScrollPositionProvider - getCurrentPosition()");
      result = await EyesWDIOUtils.getCurrentScrollPosition(this._executor);
      return result;
    } catch (e) {
      throw new EyesDriverOperationError("Failed to extract current scroll position!", e);
    } finally {
      this._logger.verbose(`Current position: ${result}`);
    }
  }

  /**
   * @override
   * @inheritDoc
   */
  async setPosition(location) {
    this._logger.verbose(`ScrollPositionProvider - Scrolling to ${location}`);
    await EyesWDIOUtils.setCurrentScrollPosition(this._executor, location);
    this._logger.verbose("ScrollPositionProvider - Done scrolling!");
  }

  /**
   * @override
   * @inheritDoc
   */
  async getEntireSize() {
    let result;
    try {
      result = await EyesWDIOUtils.getCurrentFrameContentEntireSize(this._executor);
      return result;
    } finally {
      this._logger.verbose(`ScrollPositionProvider - Entire size: ${result}`);
    }
  }

  /**
   * @override
   * @return {Promise.<ScrollPositionMemento>}
   */
  async getState() {
    const position = await this.getCurrentPosition();
    return new ScrollPositionMemento(position);
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @override
   * @param {ScrollPositionMemento} state The initial state of position
   * @return {Promise}
   */
  async restoreState(state) {
    await this.setPosition(new Location(state.getX(), state.getY()));
    this._logger.verbose("Position restored.");
  }

  /**
   * @return {Promise}
   */
  scrollToBottomRight() {
    return EyesWDIOUtils.scrollToBottomRight(this._executor);
  }
}

module.exports = ScrollPositionProvider;
