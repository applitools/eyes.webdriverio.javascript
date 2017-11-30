'use strict';

const {ImageProvider, MutableImage, Region} = require('eyes.sdk');

const ScrollPositionProvider = require('../positioning/ScrollPositionProvider');
const WDIOJSExecutor = require('../WDIOJSExecutor');

class SafariScreenshotImageProvider extends ImageProvider {

    /**
     * @param {Eyes} eyes
     * @param {Logger} logger A Logger instance.
     * @param {EyesWebDriver} driver
     * @param {PromiseFactory} promiseFactory
     */
    constructor(eyes, logger, driver, promiseFactory) {
        super();

        this._executor = eyes;
        this._logger = logger;
        this._executor = driver;
        this._promiseFactory = promiseFactory;

        this._jsExecutor = new WDIOJSExecutor(driver);
    }

    /**
     * @override
     * @return {Promise.<MutableImage>}
     */
    getImage() {
        const that = this;
        this._logger.verbose("Getting screenshot as base64...");
        return this._executor.takeScreenshot().then(screenshot64 => {
            that._logger.verbose("Done getting base64! Creating MutableImage...");
            const image = new MutableImage(screenshot64, that._promiseFactory);

            return that._executor.getDebugScreenshotsProvider().save(image, "SAFARI").then(() => {
                if (!that._executor.getForceFullPageScreenshot()) {
                    const currentFrameChain = that._executor.getDriver().getFrameChain();

                    let promise;
                    if (currentFrameChain.size() === 0) {
                        const positionProvider = new ScrollPositionProvider(that._logger, that._jsExecutor);
                        promise = positionProvider.getCurrentPosition();
                    } else {
                        promise = that._promiseFactory.resolve(currentFrameChain.getDefaultContentScrollPosition());
                    }

                    return promise.then(loc => {
                        that._logger.verbose("frame.getLocation(): " + loc);
                        return that._executor.getViewportSize().then(viewportSize => {
                            const scaleRatio = that._executor.getDevicePixelRatio();
                            viewportSize = viewportSize.scale(scaleRatio);
                            loc = loc.scale(scaleRatio);

                            return image.crop(new Region(loc, viewportSize));
                        });
                    });
                }

                return image;
            });
        });
    }
}

module.exports = SafariScreenshotImageProvider;
