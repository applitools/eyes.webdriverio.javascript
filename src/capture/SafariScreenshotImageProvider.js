'use strict';

const {ImageProvider, MutableImage, OSNames, Region} = require('eyes.sdk');

const ScrollPositionProvider = require('../positioning/ScrollPositionProvider');
const WDIOJSExecutor = require('../WDIOJSExecutor');

class SafariScreenshotImageProvider extends ImageProvider {

  /**
   * @param {Eyes} eyes
   * @param {Logger} logger A Logger instance.
   * @param {EyesWebDriver} tsInstance
   * @param {UserAgent} userAgent
   */
  constructor(eyes, logger, tsInstance, userAgent) {
    super();

    this._eyes = eyes;
    this._logger = logger;
    this._tsInstance = tsInstance;
    this._userAgent = userAgent;

    this._jsExecutor = new WDIOJSExecutor(driver);
  }

  /**
   * @override
   * @return {Promise.<MutableImage>}
   */
  async getImage() {
    let /** @type MutableImage */ image, scaleRatio, viewportSize;
    this._logger.verbose("Getting screenshot as base64...");
    const screenshot64 = await this._tsInstance.takeScreenshot();
    this._logger.verbose("Done getting base64! Creating MutableImage...");
    image = new MutableImage(screenshot64, this._eyes.getPromiseFactory());

    await this._eyes.getDebugScreenshotsProvider().save(image, "SAFARI");

    scaleRatio = this._eyes.getDevicePixelRatio();
    const viewportSize_ = await this._eyes.getViewportSize();
    viewportSize = viewportSize_.scale(scaleRatio);

    if (this._userAgent.getOS() === OSNames.IOS) {
      image = await image.crop(new Region(0, Math.ceil(64 * scaleRatio), viewportSize.getWidth(), viewportSize.getHeight()));
    }

    if (!this._eyes.getForceFullPageScreenshot()) {
      const currentFrameChain = this._eyes.getDriver().getFrameChain();

      let loc;
      if (currentFrameChain.size() === 0) {
        const positionProvider = new ScrollPositionProvider(this._logger, this._jsExecutor);
        loc = await positionProvider.getCurrentPosition();
      } else {
        loc = await this._eyes.getPromiseFactory().resolve(currentFrameChain.getDefaultContentScrollPosition());
      }

      loc = loc.scale(scaleRatio);
      return image.crop(new Region(loc, viewportSize));
    }

    return image;
  }
}

module.exports = SafariScreenshotImageProvider;
