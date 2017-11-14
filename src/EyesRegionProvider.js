"use strict";

const EyesUtils = require('eyes.utils'),
  EyesSDK = require('eyes.sdk'),
  EyesWebDriverScreenshot = require('./EyesWebDriverScreenshot');
const RegionProvider = EyesSDK.RegionProvider,
  GeometryUtils = EyesUtils.GeometryUtils;


class EyesRegionProvider extends RegionProvider {

  /**
   * @constructor
   * @param {Logger} logger
   * @param driver
   * @param {{left: number, top: number, width: number, height: number}} region
   * @param {CoordinatesType} coordinatesType
   * @augments RegionProvider
   */
  constructor(logger, driver, region, coordinatesType, promiseFactory) {
    super(region || GeometryUtils.createRegion(0, 0, 0, 0), promiseFactory);
    this._logger = logger;
    this._driver = driver;
    this._coordinatesType = coordinatesType || null;
  }


  /**
   * @return {{left: number, top: number, width: number, height: number}} A region with "as is" viewport coordinates.
   */
  getRegion() {
    return this._region;
  }

  /**
   * @param {MutableImage} image
   * @param {CoordinatesType} toCoordinatesType
   * @param {PromiseFactory} promiseFactory
   * @return {Promise<{left: number, top: number, width: number, height: number}>} A region in selected viewport coordinates.
   */
  getRegionInLocation(image, toCoordinatesType, promiseFactory) {
    const that = this;
    return promiseFactory.makePromise(resolve => {
      if (that._coordinatesType === toCoordinatesType) {
        resolve(that._region);
        return;
      }

      const ewds = new EyesWebDriverScreenshot(that._logger, that._driver, image, promiseFactory);
      return ewds.buildScreenshot().then(() => {
        const newRegion = ewds.convertRegionLocation(that._region, that._coordinatesType, toCoordinatesType);
        resolve(newRegion);
      });
    });
  }

  /**
   * @return {CoordinatesType} The type of coordinates on which the region is based.
   */
  getCoordinatesType() {
    return this._coordinatesType;
  }


}

module.exports = EyesRegionProvider;
