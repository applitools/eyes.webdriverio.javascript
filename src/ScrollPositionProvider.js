'use strict';

const {ArgumentGuard, PositionProvider, Location, EyesError} = require('eyes.sdk');

const EyesWDIOUtils = require('./EyesWDIOUtils');
const ScrollPositionMemento = require('./ScrollPositionMemento');

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
  getCurrentPosition() {
    this._logger.verbose("ScrollPositionProvider - getCurrentPosition()");

    const that = this;
    return EyesWDIOUtils.getCurrentScrollPosition(this._executor).catch(err => {
      throw new EyesError("Failed to extract current scroll position!", err);
    }).then(result => {
      that._logger.verbose(`Current position: ${result}`);
      return result;
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  async setPosition(location) {
    const that = this;
    that._logger.verbose(`ScrollPositionProvider - Scrolling to ${location}`);
    await EyesWDIOUtils.setCurrentScrollPosition(this._executor, location);
    that._logger.verbose("ScrollPositionProvider - Done scrolling!");
  }

  /**
   * @override
   * @inheritDoc
   */
  async getEntireSize() {
    const that = this;
    const result = await EyesWDIOUtils.getCurrentFrameContentEntireSize(this._executor);
    that._logger.verbose(`ScrollPositionProvider - Entire size: ${result}`);
    return result;
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
    try {
      return await this.setPosition(new Location(state.x, state.y));
    } finally {
      this._logger.verbose("Position restored.");
    }
  }
}

module.exports = ScrollPositionProvider;
