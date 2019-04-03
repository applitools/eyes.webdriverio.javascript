'use strict';

const {TypeUtils} = require('@applitools/eyes-sdk-core');

const {EyesWDIO} = require('./EyesWDIO');
const {EyesVisualGrid} = require('./EyesVisualGrid');
const {VisualGridRunner} = require('./visualgrid/VisualGridRunner');

/**
 * @abstract
 * @extends EyesVisualGrid
 * @extends EyesWDIO
 */
class Eyes {
  // noinspection JSAnnotator
  /**
   * Creates a new (possibly disabled) Eyes instance that interacts with the Eyes Server at the specified url.
   *
   * @param {string|boolean|VisualGridRunner} [serverUrl=EyesBase.getDefaultServerUrl()] The Eyes server URL.
   * @param {boolean} [isDisabled=false] Set to true to disable Applitools Eyes and use the webdriver directly.
   * @param {boolean} [isVisualGrid]
   * @return {EyesWDIO|EyesVisualGrid}
   */
  constructor(serverUrl, isDisabled, isVisualGrid = false) {
    let visualGridRunner;
    if (serverUrl instanceof VisualGridRunner) {
      isVisualGrid = true;
      visualGridRunner = serverUrl;
      serverUrl = undefined;
    } else if (TypeUtils.isBoolean(serverUrl)) {
      isVisualGrid = serverUrl;
      serverUrl = undefined;
    }

    if (isVisualGrid === true) {
      return new EyesVisualGrid(serverUrl, isDisabled, visualGridRunner);
    } else {
      return new EyesWDIO(serverUrl, isDisabled);
    }
  }

}

exports.Eyes = Eyes;
