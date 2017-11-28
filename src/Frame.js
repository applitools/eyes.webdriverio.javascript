'use strict';

const EyesUtils = require('eyes.utils');
const ArgumentGuard = EyesUtils.ArgumentGuard;


class Frame {

  /**
   * @constructor
   * @param {Object} logger A Logger instance.
   * @param {EyesWebElement} reference The web element for the frame, used as a reference to switch into the frame.
   * @param {string} frameId The id of the frame. Can be used later for comparing two frames.
   * @param {{x: number, y: number}} location The location of the frame within the current frame.
   * @param {{width: number, height: number}} size The frame element size (i.e., the size of the frame on the screen, not the internal document size).
   * @param {{x: number, y: number}} parentScrollPosition The scroll position the frame's parent was in when the frame was switched to.
   */
  constructor(logger, reference, frameId, location, size, parentScrollPosition) {
    ArgumentGuard.notNull(logger, "logger");
    ArgumentGuard.notNull(reference, "reference");
    ArgumentGuard.notNull(frameId, "frameId");
    ArgumentGuard.notNull(location, "location");
    ArgumentGuard.notNull(size, "size");
    ArgumentGuard.notNull(parentScrollPosition, "parentScrollPosition");

    logger.verbose("Frame(logger, reference, " + frameId + ", ", location, ", ", size, ", ", parentScrollPosition, ")");

    this._logger = logger;
    this._reference = reference;
    this._id = frameId;
    this._parentScrollPosition = parentScrollPosition;
    this._size = size;
    this._location = location;
  }

  /**
   * @returns {EyesWebElement}
   */
  get reference() {
    return this._reference;
  }

  /**
   * @returns {string}
   */
  get id() {
    return this._id;
  }

  /**
   * @returns {{x: number, y: number}}
   */
  get location() {
    return this._location;
  }

  /**
   * @returns {{width: number, height: number}}
   */
  get size() {
    return this._size;
  }

  /**
   * @returns {{x: number, y: number}}
   */
  get parentScrollPosition() {
    return this._parentScrollPosition;
  }

}

module.exports = Frame;
