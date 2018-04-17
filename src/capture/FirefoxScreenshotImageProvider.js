'use strict';

const {ImageProvider, MutableImage, Region} = require('@applitools/eyes.sdk.core');

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
   * @param {EyesWebDriver} tsInstance
   */
  constructor(eyes, logger, tsInstance) {
    super();

    this._eyes = eyes;
    this._logger = logger;
    this._tsInstance = tsInstance;
  }

  /**
   * @override
   * @return {Promise.<MutableImage>}
   */
  getImage() {
    const that = this;
    this._logger.verbose("Getting screenshot as base64...");
    return this._tsInstance.takeScreenshot().then(screenshot64 => {
      that._logger.verbose("Done getting base64! Creating BufferedImage...");
      const image = new MutableImage(screenshot64, that._eyes.getPromiseFactory());

      return that._eyes.getDebugScreenshotsProvider().save(image, "FIREFOX_FRAME").then(() => {
        const frameChain = that._tsInstance.getFrameChain();
        if (frameChain.size() > 0) {
          let fullImage;
          //Frame frame = frameChain.peek();
          //Region region = eyes.getRegionToCheck();
          const screenshot = new EyesWDIOScreenshot(that._logger, that._tsInstance, image, that._eyes.getPromiseFactory());
          return screenshot.init().then(() => {
            return that._eyes.getViewportSize();
          }).then(viewportSize => {
            let loc = screenshot.getFrameWindow().getLocation();
            that._logger.verbose("frame.getLocation(): " + loc);

            const scaleRatio = that._eyes.getDevicePixelRatio();
            viewportSize = viewportSize.scale(scaleRatio);
            loc = loc.scale(scaleRatio);

            fullImage = MutableImage.newImage(viewportSize.getWidth(), viewportSize.getHeight(), that._eyes.getPromiseFactory());

            return fullImage.copyRasterData(loc.getX(), loc.getY(), image);
          }).then(() => {
            return fullImage;
          });
        }

        return image;
      });
    });
  }
}

module.exports = FirefoxScreenshotImageProvider;
