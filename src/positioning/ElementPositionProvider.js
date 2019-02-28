'use strict';

const {ArgumentGuard, PositionProvider, RectangleSize, Location} = require('@applitools/eyes-sdk-core');

const ElementPositionMemento = require('./ElementPositionMemento');
const EyesWebElement = require('./../wrappers/EyesWebElement');

class ElementPositionProvider extends PositionProvider {

  /**
   * @param {Logger} logger A Logger instance.
   * @param {EyesWebDriver} driver
   * @param {EyesWebElement} element
   */
  constructor(logger, driver, element) {
    super();
    ArgumentGuard.notNull(logger, "logger");
    ArgumentGuard.notNull(element, "element");

    this._logger = logger;
    this._element = (element instanceof EyesWebElement) ? element : new EyesWebElement(logger, driver, element);

    this._logger.verbose("creating ElementPositionProvider");
  }

  /**
   * @override
   * @inheritDoc
   */
  getCurrentPosition() {
    this._logger.verbose("getCurrentScrollPosition()");

    const that = this;
    let scrollLeft;
    return that._element.getScrollLeft().then(_scrollLeft => {
      scrollLeft = _scrollLeft;
      return that._element.getScrollTop();
    }).then(_scrollTop => {
      const location = new Location(scrollLeft, _scrollTop);
      that._logger.verbose(`Current position: ${location}`);
      return location;
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  setPosition(location) {
    const that = this;
    that._logger.verbose(`Scrolling element to: ${location}`);
    return that._element.scrollTo(location).then(() => {
      that._logger.verbose("Done scrolling element!");
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  getEntireSize() {
    this._logger.verbose("ElementPositionProvider - getEntireSize()");

    const that = this;
    let scrollWidth;
    return that._element.getScrollWidth().then(_scrollWidth => {
      scrollWidth = _scrollWidth;
      return that._element.getScrollHeight();
    }).then(_scrollHeight => {
      const size = new RectangleSize(scrollWidth, _scrollHeight);
      that._logger.verbose(`ElementPositionProvider - Entire size: ${size}`);
      return size;
    });
  }

  /**
   * @override
   * @return {Promise.<ElementPositionMemento>}
   */
  getState() {
    return this.getCurrentPosition().then(position => new ElementPositionMemento(position));
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * @override
   * @param {ElementPositionMemento} state The initial state of position
   * @return {Promise}
   */
  restoreState(state) {
    const that = this;
    return this.setPosition(new Location(state.getX(), state.getY())).then(() => {
      that._logger.verbose("Position restored.");
    });
  }

  /**
   *
   * @returns {EyesWebElement|*}
   */
  get element() {
    return this._element;
  }
}

module.exports = ElementPositionProvider;