'use strict';

const Frame = require('./Frame');
const EyesUtils = require('eyes.utils');
const ArgumentGuard = EyesUtils.ArgumentGuard;
const GeometryUtils = EyesUtils.GeometryUtils;


class FrameChain {

  /**
   * Creates a new frame chain.
   * @param {Object} logger A Logger instance.
   * @param {FrameChain} other A frame chain from which the current frame chain will be created.
   */
  constructor(logger, other) {
    ArgumentGuard.notNull(logger, "logger");

    this._logger = logger;

    if (other && other instanceof FrameChain) {
      this._logger.verbose("Frame chain copy constructor (size " + other.size() + ")");
      this._frames = [];
      let i = 0;
      const l = other.size();
      for (; i < l; i++) {
        this._frames.push(new Frame(logger,
          other.getFrames()[i].getReference(),
          other.getFrames()[i].getId(),
          other.getFrames()[i].getLocation(),
          other.getFrames()[i].getSize(),
          other.getFrames()[i].getParentScrollPosition())
        );
      }
      this._logger.verbose("Done!");
    } else {
      this._frames = [];
    }
  }

  /**
   * Compares two frame chains.
   * @param {FrameChain} c1 Frame chain to be compared against c2.
   * @param {FrameChain} c2 Frame chain to be compared against c1.
   * @return {boolean} True if both frame chains represent the same frame, false otherwise.
   */
  static isSameFrameChain(c1, c2) {
    const lc1 = c1.size();
    const lc2 = c2.size();

    // different chains size means different frames
    if (lc1 != lc2) {
      return false;
    }

    for (let i = 0; i < lc1; ++i) {
      if (c1.getFrames()[i].getId() != c1.getFrames()[i].getId()) {
        return false;
      }
    }

    return true;
  }

  /**
   * @return {Array.<Frame>} frames stored in chain
   */
  getFrames() {
    return this._frames;
  }

  /**
   * @param {int} index Index of needed frame
   * @return {Frame} frame by index in array
   */
  getFrame(index) {
    if (this._frames.length > index) {
      return this._frames[index];
    }

    throw new Error("No frames for given index");
  }

  /**
   *
   * @return {int} The number of frames in the chain.
   */
  size() {
    return this._frames.length;
  }

  /**
   * Removes all current frames in the frame chain.
   */
  clear() {
    return this._frames = [];
  }

  /**
   * Removes the last inserted frame element. Practically means we switched
   * back to the parent of the current frame
   */
  pop() {
    return this._frames.pop();
  }

  /**
   * Appends a frame to the frame chain.
   * @param {Frame} frame The frame to be added.
   */
  push(frame) {
    return this._frames.push(frame);
  }

  /**
   * @return {{x: number, y: number}} The location of the current frame in the page.
   */
  getCurrentFrameOffset() {
    let result = {x: 0, y: 0};

    let i = 0;
    const l = this._frames.length;
    for (; i < l; i++) {
      result = GeometryUtils.locationOffset(result, this._frames[i].getLocation());
    }

    return result;
  }

  /**
   * @return {{x: number, y: number}} The outermost frame's location, or NoFramesException.
   */
  getDefaultContentScrollPosition() {
    if (this._frames.length == 0) {
      throw new Error("No frames in frame chain");
    }
    return this._frames[0].getParentScrollPosition();
  }

  /**
   * @return {{width: number, height: number}} The size of the current frame.
   */
  getCurrentFrameSize() {
    this._logger.verbose("getCurrentFrameSize()");
    const result = this._frames[this._frames.length - 1].getSize();
    this._logger.verbose("Done!");
    return result;
  }

}

module.exports = FrameChain;
