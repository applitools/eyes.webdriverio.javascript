'use strict';

const {ImageProvider, MutableImage, Region, OSNames, RectangleSize} = require('@applitools/eyes.sdk.core');

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

    this._jsExecutor = new WDIOJSExecutor(tsInstance);
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
      screenshot64 = screenshot64.replace(/\r\n/g, ''); // Because of SauceLabs returns image with line breaks

      that._logger.verbose("Done getting base64! Creating MutableImage...");
      image = new MutableImage(screenshot64, that._eyes.getPromiseFactory());
    }).then(() => {
      return that._eyes.getDebugScreenshotsProvider().save(image, "SAFARI");
    }).then(() => {
      if (that._eyes.getIsCutProviderExplicitlySet()) {
        return image;
      }
      scaleRatio = that._eyes.getDevicePixelRatio();
      return that._eyes.getViewportSize();
    }).then(originalViewportSize => {
      viewportSize = originalViewportSize.scale(scaleRatio);

      that._logger.verbose(`logical viewport size: ${originalViewportSize}`);

      if (that._userAgent.getOS() === OSNames.IOS) {
        let topBarHeight = 20;
        let leftBarWidth = 0;
        let bottomBarHeight = 44;
        let rightBarWidth = 0;
        let urlBarHeight = 44;

        const imageWidth = image.getWidth();
        const imageHeight = image.getHeight();
        const displayLogicalWidth = Math.ceil(imageWidth / scaleRatio);
        const displayLogicalHeight = Math.ceil(imageHeight / scaleRatio);

        that._logger.verbose(`physical device pixel size: ${imageWidth} x ${imageHeight}`);
        that._logger.verbose(`physical device logical size: ${displayLogicalWidth} x ${displayLogicalHeight}`);

        if (displayLogicalHeight === 736 && displayLogicalWidth === 414) { // iPhone 5.5 inch
          that._logger.verbose('iPhone 5.5 inch detected');
          topBarHeight = 18;
        } else if (displayLogicalHeight === 812 && displayLogicalWidth === 375) { // iPhone 5.8 inch p
          that._logger.verbose('iPhone 5.8 inch portrait detected');
          topBarHeight = 44;
          bottomBarHeight = 83;
        } else if (displayLogicalWidth === 812 && displayLogicalHeight === 375) { // iPhone 5.8 inch l
          that._logger.verbose('iPhone 5.8 inch landscape detected');
          leftBarWidth = 44;
          rightBarWidth = 44;
        }

        if (displayLogicalHeight < displayLogicalWidth) {
          that._logger.verbose('landscape mode detected');
          topBarHeight = 0;
          if (displayLogicalWidth === 812 && displayLogicalHeight === 375) { // on iPhone X crop the home indicator.
            bottomBarHeight = 15;
          } else {
            bottomBarHeight = 0;
          }

          // on iPhone 5.5 inch with Safari 10 in landscape mode crop the tabs bar.
          if (displayLogicalWidth === 736 && displayLogicalHeight === 414 &&
            parseInt(that._userAgent.getBrowserMajorVersion(), 10) < 11) {
            topBarHeight = 33;
          }
        }

        if (parseInt(that._userAgent.getBrowserMajorVersion(), 10) >= 11) { // Safari >= 11
          that._logger.verbose('safari version 11 or higher detected');
          urlBarHeight = 50;
        }

        viewportSize = new RectangleSize(
          Math.ceil(imageWidth - (leftBarWidth + rightBarWidth) * scaleRatio),
          Math.ceil(imageHeight - (topBarHeight + urlBarHeight + bottomBarHeight) * scaleRatio)
        );

        that._logger.verbose(`computed physical viewport size: ${viewportSize}`);
        that._logger.verbose('cropping IOS browser image');

        const left = Math.ceil(leftBarWidth * scaleRatio);
        const top = Math.ceil((topBarHeight + urlBarHeight) * scaleRatio);
        const width = viewportSize.getWidth();
        const height = viewportSize.getHeight();
        return image.crop(new Region(left, top, width, height));
      }

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
          const region = new Region(loc, viewportSize);
          return image.crop(region);
        });
      }

      return image;
    });
  }
}

module.exports = SafariScreenshotImageProvider;
