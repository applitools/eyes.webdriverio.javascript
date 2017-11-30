'use strict';

const {ImageProvider, MutableImage, Region} = require('eyes.sdk');

const EyesWDIOScreenshot = require('./EyesWDIOScreenshot');

/**
 * This class is needed because in certain versions of firefox, a frame screenshot only brings the frame viewport.
 * To solve this issue, we create an image with the full size of the browser viewport and place the frame image
 * on it in the appropriate place.
 */
class FirefoxScreenshotImageProvider extends ImageProvider {

    /**
     * @param {Eyes} eyes
     * @param {Logger} logger
     * @param {EyesWebDriver} driver
     * @param {PromiseFactory} promiseFactory
     */
    constructor(eyes, logger, driver, promiseFactory) {
        super();

        this._executor = eyes;
        this._logger = logger;
        this._executor = driver;
        this._promiseFactory = promiseFactory;
    }

    /**
     * @override
     * @return {Promise.<MutableImage>}
     */
    getImage() {
        const that = this;
        this._logger.verbose("Getting screenshot as base64...");
        return this._executor.takeScreenshot().then(screenshot64 => {
            that._logger.verbose("Done getting base64! Creating BufferedImage...");
            const image = new MutableImage(screenshot64, that._promiseFactory);

            return that._executor.getDebugScreenshotsProvider().save(image, "FIREFOX_FRAME").then(() => {
                const frameChain = that._executor.getFrameChain();
                if (frameChain.size() > 0) {
                    //Frame frame = frameChain.peek();
                    //Region region = eyes.getRegionToCheck();
                    const screenshot = new EyesWDIOScreenshot(that._logger, that._executor, image, that._promiseFactory);
                    return screenshot.init().then(() => {
                        return that._executor.getViewportSize();
                    }).then(viewportSize => {
                        let loc = screenshot.getFrameWindow().getLocation();
                        that._logger.verbose("frame.getLocation(): " + loc);

                        const scaleRatio = that._executor.getDevicePixelRatio();
                        viewportSize = viewportSize.scale(scaleRatio);
                        loc = loc.scale(scaleRatio);

                        return image.crop(new Region(loc, viewportSize));
                    });
                }

                return image;
            });
        });
    }
}

module.exports = FirefoxScreenshotImageProvider;
