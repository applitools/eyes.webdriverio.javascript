'use strict';

const {ArgumentGuard} = require('eyes.sdk');

/**
 * Encapsulates a frame/iframe. This is a generic type class,
 * and it's actual type is determined by the reference used by the user in
 * order to switch into the frame.
 */
class Frame {

  /**
   * @param {Logger} logger A Logger instance.
   * @param {WebElement} reference The web element for the frame, used as a reference to switch into the frame.
   * @param {Location} location The location of the frame within the current frame.
   * @param {RectangleSize} size The frame element size (i.e., the size of the frame on the screen, not the internal document size).
   * @param {RectangleSize} innerSize The frame element inner size (i.e., the size of the frame actual size, without borders).
   * @param {Location} originalLocation The scroll location of the frame.
   * @param {String} originalOverflow The original overflow value of the frame.
   */
  constructor(logger, reference, location, size, innerSize, originalLocation, originalOverflow) {
    ArgumentGuard.notNull(logger, "logger");
    ArgumentGuard.notNull(reference, "reference");
    ArgumentGuard.notNull(location, "location");
    ArgumentGuard.notNull(size, "size");
    ArgumentGuard.notNull(innerSize, "innerSize");
    ArgumentGuard.notNull(originalLocation, "originalLocation");

    logger.verbose(`Frame(logger, reference, ${location}, ${size}, ${innerSize})`);

    this._logger = logger;
    this._reference = reference;
    this._location = location;
    this._size = size;
    this._innerSize = innerSize;
    this._originalLocation = originalLocation;
    this._originalOverflow = originalOverflow;
  }

  /**
   * @return {WebElement}
   */
  getReference() {
    return this._reference;
  }

  /**
   * @return {Location}
   */
  getLocation() {
    return this._location;
  }

  /**
   * @return {RectangleSize}
   */
  getSize() {
    return this._size;
  }

  /**
   * @return {RectangleSize}
   */
  getInnerSize() {
    return this._innerSize;
  }

  /**
   * @return {Location}
   */
  getOriginalLocation() {
    return this._originalLocation;
  }

  /**
   * @return {String}
   */
  getOriginalOverflow() {
    return this._originalOverflow;
  }
}

module.exports = Frame;
