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

    this._eyes = eyes;
    this._logger = logger;
    this._executor = driver;
    this._promiseFactory = promiseFactory;

    this._jsExecutor = new WDIOJSExecutor(driver);
  }

  /**
   * @override
   * @return {Promise.<MutableImage>}
   */
  async getImage() {
    const that = this;
    this._logger.verbose("Getting screenshot as base64...");
    const screenshot64 = await this._executor.takeScreenshot();
    that._logger.verbose("Done getting base64! Creating MutableImage...");
    const image = new MutableImage(screenshot64, that._promiseFactory);

    await that._eyes.getDebugScreenshotsProvider().save(image, "SAFARI");
    if (!that._eyes.getForceFullPageScreenshot()) {
      const currentFrameChain = that._executor.frameChain;

      let loc;
      if (currentFrameChain.size() === 0) {
        const positionProvider = new ScrollPositionProvider(that._logger, that._jsExecutor);
        loc = await positionProvider.getCurrentPosition();
      } else {
        loc = that._promiseFactory.resolve(currentFrameChain.getDefaultContentScrollPosition());
      }

      that._logger.verbose("frame.getLocation(): " + loc);
      let viewportSize = await that._eyes.getViewportSize();
      const scaleRatio = that._eyes.getDevicePixelRatio();
      viewportSize = viewportSize.scale(scaleRatio);
      loc = loc.scale(scaleRatio);

      return image.crop(new Region(loc, viewportSize));
    }

    return image;
  }
}

module.exports = SafariScreenshotImageProvider;
