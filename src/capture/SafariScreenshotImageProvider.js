'use strict';

const {ImageProvider, MutableImage, Region, OSNames} = require('@applitools/eyes.sdk.core');

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
  getImage() {
    let /** @type MutableImage */ image, scaleRatio, viewportSize;
    const that = this;
    that._logger.verbose("Getting screenshot as base64...");
    return that._tsInstance.takeScreenshot().then(screenshot64 => {
      that._logger.verbose("Done getting base64! Creating MutableImage...");
      image = new MutableImage(screenshot64, that._eyes.getPromiseFactory());
    }).then(() => {
      return that._eyes.getDebugScreenshotsProvider().save(image, "SAFARI");
    }).then(() => {
      scaleRatio = that._eyes.getDevicePixelRatio();
      return that._eyes.getViewportSize();
    }).then(viewportSize_ => {
      viewportSize = viewportSize_.scale(scaleRatio);

      if (that._userAgent.getOS() === OSNames.IOS) {
        return image.crop(new Region(0, Math.ceil(64 * scaleRatio), viewportSize.getWidth(), viewportSize.getHeight())).then(croppedImage => {
          image = croppedImage;
        });
      }
    }).then(() => {
      if (!that._eyes.getForceFullPageScreenshot()) {
        const currentFrameChain = that._eyes.getDriver().getFrameChain();

        let promise;
        if (currentFrameChain.size() === 0) {
          const positionProvider = new ScrollPositionProvider(that._logger, that._jsExecutor);
          promise = positionProvider.getCurrentPosition();
        } else {
          promise = that._eyes.getPromiseFactory().resolve(currentFrameChain.getDefaultContentScrollPosition());
        }

        return promise.then(loc => {
          loc = loc.scale(scaleRatio);
          return image.crop(new Region(loc, viewportSize));
        });
      }

      return image;
    });
  }
}

module.exports = SafariScreenshotImageProvider;
