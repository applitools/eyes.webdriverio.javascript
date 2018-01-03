'use strict';

/**
 * @interface
 */
class ImageOrientationHandler {

    /**
     * @param {WebDriver} driver
     * @return {Promise.<Boolean>}
     */
    isLandscapeOrientation(driver) {}

    /**
     * @param {Logger} logger
     * @param {WebDriver} driver
     * @param {MutableImage} image
     * @return {Promise.<Boolean>}
     */
    tryAutomaticRotation(logger, driver, image) {}
}

module.exports = ImageOrientationHandler;
