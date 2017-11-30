'use strict';

/**
 * @interface
 */
class ImageOrientationHandler {

    /**
     * @param {IWebDriver} driver
     * @return {Promise.<Boolean>}
     */
    isLandscapeOrientation(driver) {}

    /**
     * @param {Logger} logger
     * @param {IWebDriver} driver
     * @param {MutableImage} image
     * @return {Promise.<Boolean>}
     */
    tryAutomaticRotation(logger, driver, image) {}
}

module.exports = ImageOrientationHandler;
