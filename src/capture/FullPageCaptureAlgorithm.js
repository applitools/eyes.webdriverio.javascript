'use strict';

const {ArgumentGuard, Location, Region, RectangleSize, CoordinatesType, GeneralUtils, MutableImage, NullCutProvider} = require('eyes.sdk.core');

const NullRegionPositionCompensation = require('../positioning/NullRegionPositionCompensation');
const ScrollPositionProvider = require('../positioning/ScrollPositionProvider');

const MIN_SCREENSHOT_PART_HEIGHT = 10;

class FullPageCaptureAlgorithm {

  /**
   * @param {Logger} logger
   * @param {UserAgent} userAgent
   * @param {EyesJsExecutor} jsExecutor
   * @param {PromiseFactory} promiseFactory
   */
  constructor(logger, userAgent, jsExecutor, promiseFactory) {
    ArgumentGuard.notNull(logger, "logger");
    // TODO: why do we need userAgent here?
    // ArgumentGuard.notNull(userAgent, "userAgent");
    ArgumentGuard.notNull(jsExecutor, "jsExecutor");
    ArgumentGuard.notNull(promiseFactory, "promiseFactory");

    this._logger = logger;
    this._userAgent = userAgent;
    this._jsExecutor = jsExecutor;
    this._promiseFactory = promiseFactory;
  }

  /**
   * Returns a stitching of a region.
   *
   * @param {ImageProvider} imageProvider The provider for the screenshot.
   * @param {Region} region The region to stitch. If {@code Region.EMPTY}, the entire image will be stitched.
   * @param {PositionProvider} originProvider A provider for scrolling to initial position before starting the actual stitching.
   * @param {PositionProvider} positionProvider A provider of the scrolling implementation.
   * @param {ScaleProviderFactory} scaleProviderFactory A factory for getting the scale provider.
   * @param {CutProvider} cutProvider
   * @param {int} waitBeforeScreenshots Time to wait before each screenshot (milliseconds).
   * @param {DebugScreenshotsProvider} debugScreenshotsProvider
   * @param {EyesScreenshotFactory} screenshotFactory The factory to use for creating screenshots from the images.
   * @param {int} stitchingOverlap The width of the overlapping parts when stitching an image.
   * @param {RegionPositionCompensation} regionPositionCompensation A strategy for compensating region positions for some browsers.
   * @return {Promise.<MutableImage>} An image which represents the stitched region.
   */
  async getStitchedRegion(imageProvider, region, originProvider, positionProvider, scaleProviderFactory, cutProvider, waitBeforeScreenshots, debugScreenshotsProvider, screenshotFactory, stitchingOverlap, regionPositionCompensation) {
    this._logger.verbose("getStitchedRegion()");

    ArgumentGuard.notNull(region, "region");
    ArgumentGuard.notNull(originProvider, "originProvider");
    ArgumentGuard.notNull(positionProvider, "positionProvider");

    this._logger.verbose(`getStitchedRegion: originProvider: ${originProvider.constructor.name} ; positionProvider: ${positionProvider.constructor.name} ; cutProvider: ${cutProvider.constructor.name}`);
    this._logger.verbose(`Region to check: ${region}`);

    let originalPosition, currentPosition, /** @type {MutableImage} */ image, scaleProvider, pixelRatio,
      regionInScreenshot, entireSize;

    // Saving the original position (in case we were already in the outermost frame).
    originalPosition = await originProvider.getState();

    currentPosition = await _setPositionLoop(originProvider, Location.ZERO, 3, waitBeforeScreenshots, this._promiseFactory);

    if (currentPosition.getX() !== 0 || currentPosition.getY() !== 0) {
      await originProvider.restoreState(originalPosition);
      throw new Error("Couldn't set position to the top/left corner!");
    }

    this._logger.verbose("Getting top/left image...");
    image = await imageProvider.getImage();
    await debugScreenshotsProvider.save(image, "original");

    // FIXME - scaling should be refactored
    scaleProvider = scaleProviderFactory.getScaleProvider(image.getWidth());
    // Notice that we want to cut/crop an image before we scale it, we need to change
    pixelRatio = 1 / scaleProvider.getScaleRatio();

    // FIXME - cropping should be overlaid, so a single cut provider will only handle a single part of the image.
    cutProvider = cutProvider.scale(pixelRatio);
    if (!(cutProvider instanceof NullCutProvider)) {
      image = await cutProvider.cut(image);
      await debugScreenshotsProvider.save(image, "original-cut");
    }

    this._logger.verbose("Done! Creating screenshot object...");

    // We need the screenshot to be able to convert the region to screenshot coordinates.
    const screenshot = await screenshotFactory.makeScreenshot(image);

    this._logger.verbose("Done! Getting region in screenshot...");

    regionInScreenshot = _getRegionInScreenshot(this._logger, region, image, pixelRatio, screenshot, regionPositionCompensation);

    if (!regionInScreenshot.getSize().equals(region.getSize())) {
      regionInScreenshot = _getRegionInScreenshot(this._logger, region, image, pixelRatio, screenshot, regionPositionCompensation);
    }

    if (!regionInScreenshot.isEmpty()) {
      image = await image.getImagePart(regionInScreenshot);
      await _saveDebugScreenshotPart(debugScreenshotsProvider, image, region, "cropped");
    }

    if (pixelRatio !== 1) {
      image = await image.scale(scaleProvider.getScaleRatio());
      await debugScreenshotsProvider.save(image, "scaled");
    }

    const checkingAnElement = !region.isEmpty();
    entireSize = await positionProvider.getEntireSize();
    if (!checkingAnElement) {
      try {
        const spp = new ScrollPositionProvider(this._logger, this._jsExecutor);
        const originalCurrentPosition = await spp.getCurrentPosition();
        await spp.scrollToBottomRight();

        const localCurrentPosition = await spp.getCurrentPosition();

        entireSize = new RectangleSize(
          localCurrentPosition.getX() + image.getWidth(),
          localCurrentPosition.getY() + image.getHeight());

        this._logger.verbose(`Entire size of region context: ${entireSize}`);
        await spp.setPosition(originalCurrentPosition);
      } catch (err) {
        this._logger.log("WARNING: Failed to extract entire size of region context" + err);
        this._logger.log(`Using image size instead: ${image.getWidth()}x${image.getHeight()}`);
        entireSize = new RectangleSize(image.getWidth(), image.getHeight());
      }
    }

    // Notice that this might still happen even if we used "getImagePart", since "entirePageSize" might be that of a frame.
    if (image.getWidth() >= entireSize.getWidth() && image.getHeight() >= entireSize.getHeight()) {
      await originProvider.restoreState(originalPosition);
      return image;
    }

    // These will be used for storing the actual stitched size (it is sometimes less than the size extracted via "getEntireSize").
    let /** @type {Location} */ lastSuccessfulLocation = Location.ZERO,
      lastSuccessfulPartSize,
      originalStitchedState,
      /** @type {MutableImage} */ partImage;

    // The screenshot part is a bit smaller than the screenshot size, in order to eliminate duplicate bottom scroll bars, as well as fixed position footers.
    const partImageSize = new RectangleSize(image.getWidth(), Math.max(image.getHeight() - stitchingOverlap, MIN_SCREENSHOT_PART_HEIGHT));

    this._logger.verbose(`"Total size: ${entireSize}, image part size: ${partImageSize}`);

    // Getting the list of sub-regions composing the whole region (we'll take screenshot for each one).
    const entirePage = new Region(Location.ZERO, entireSize);
    const imageParts = entirePage.getSubRegions(partImageSize);

    this._logger.verbose("Creating stitchedImage container. Size: " + entireSize);

    //Notice stitchedImage uses the same type of image as the screenshots.
    let stitchedImage = MutableImage.newImage(entireSize.getWidth(), entireSize.getHeight(), this._promiseFactory);

    this._logger.verbose("Done! Adding initial screenshot..");
    // Starting with the screenshot we already captured at (0,0).
    this._logger.verbose(`Initial part:(0,0)[${image.getWidth()} x ${image.getHeight()}]`);

    await stitchedImage.copyRasterData(0, 0, image);
    this._logger.verbose("Done!");

    lastSuccessfulPartSize = new RectangleSize(image.getWidth(), image.getHeight());

    originalStitchedState = await positionProvider.getState();

    // Take screenshot and stitch for each screenshot part.
    this._logger.verbose("Getting the rest of the image parts...");

    for (const partRegion of imageParts) {
      // Skipping screenshot for 0,0 (already taken)
      if (partRegion.getLeft() === 0 && partRegion.getTop() === 0) {
        continue;
      }

      this._logger.verbose("Taking screenshot for " + partRegion);

      // Set the position to the part's top/left.
      await positionProvider.setPosition(partRegion.getLocation());
      // Giving it time to stabilize.
      await GeneralUtils.sleep(waitBeforeScreenshots, this._promiseFactory);

      // Screen size may cause the scroll to only reach part of the way.
      currentPosition = await positionProvider.getCurrentPosition();
      this._logger.verbose("Set position to " + currentPosition);

      // Actually taking the screenshot.
      this._logger.verbose("Getting image...");
      partImage = await imageProvider.getImage();
      await debugScreenshotsProvider.save(partImage, "original-scrolled-" + currentPosition.toStringForFilename());

      // FIXME - cropping should be overlaid (see previous comment re cropping)
      if (!(cutProvider instanceof NullCutProvider)) {
        this._logger.verbose("cutting...");
        partImage = await cutProvider.cut(partImage);
        await debugScreenshotsProvider.save(partImage, "original-scrolled-cut-" + currentPosition.toStringForFilename());
      }

      if (!regionInScreenshot.isEmpty()) {
        this._logger.verbose("cropping...");
        partImage = await partImage.getImagePart(regionInScreenshot);
        await _saveDebugScreenshotPart(debugScreenshotsProvider, partImage, partRegion, "original-scrolled-" + currentPosition.toStringForFilename());
      }

      if (pixelRatio !== 1) {
        this._logger.verbose("scaling...");
        // FIXME - scaling should be refactored
        partImage = await partImage.scale(scaleProvider.getScaleRatio());
        await _saveDebugScreenshotPart(debugScreenshotsProvider, partImage, partRegion, "original-scrolled-" + currentPosition.toStringForFilename() + "-scaled-");
      }
      this._logger.verbose("Stitching part into the image container...");

      // Stitching the current part.
      await stitchedImage.copyRasterData(currentPosition.getX(), currentPosition.getY(), partImage);
      this._logger.verbose("Done!");

      lastSuccessfulLocation = currentPosition;
    }

    if (partImage) {
      lastSuccessfulPartSize = new RectangleSize(partImage.getWidth(), partImage.getHeight());
    }

    this._logger.verbose("Stitching done!");

    await positionProvider.restoreState(originalStitchedState);

    await originProvider.restoreState(originalPosition);

    // If the actual image size is smaller than the extracted size, we crop the image.
    const actualImageWidth = lastSuccessfulLocation.getX() + lastSuccessfulPartSize.getWidth();
    const actualImageHeight = lastSuccessfulLocation.getY() + lastSuccessfulPartSize.getHeight();
    this._logger.verbose("Extracted entire size: " + entireSize);
    this._logger.verbose("Actual stitched size: " + actualImageWidth + "x" + actualImageHeight);

    if (actualImageWidth < stitchedImage.getWidth() || actualImageHeight < stitchedImage.getHeight()) {
      this._logger.verbose("Trimming unnecessary margins..");
      const region = new Region(0, 0, Math.min(actualImageWidth, stitchedImage.getWidth()), Math.min(actualImageHeight, stitchedImage.getHeight()));
      stitchedImage = await stitchedImage.getImagePart(region);
      this._logger.verbose("Done!");
    }

    await debugScreenshotsProvider.save(stitchedImage, "stitched");

    return stitchedImage;
  }
}

/**
 * @private
 * @param {Logger} logger
 * @param {Region} region
 * @param {MutableImage} image
 * @param {number} pixelRatio
 * @param {EyesScreenshot} screenshot
 * @param {RegionPositionCompensation} regionPositionCompensation
 * @return {Region}
 */
const _getRegionInScreenshot = (logger, region, image, pixelRatio, screenshot, regionPositionCompensation) => {
  // Region regionInScreenshot = screenshot.convertRegionLocation(regionProvider.getRegion(), regionProvider.getCoordinatesType(), CoordinatesType.SCREENSHOT_AS_IS);
  let regionInScreenshot = screenshot.getIntersectedRegion(region, CoordinatesType.SCREENSHOT_AS_IS);

  logger.verbose("Done! Region in screenshot: " + regionInScreenshot);
  regionInScreenshot = regionInScreenshot.scale(pixelRatio);
  logger.verbose("Scaled region: " + regionInScreenshot);

  if (!regionPositionCompensation) {
    regionPositionCompensation = new NullRegionPositionCompensation();
  }

  regionInScreenshot = regionPositionCompensation.compensateRegionPosition(regionInScreenshot, pixelRatio);

  // Handling a specific case where the region is actually larger than
  // the screenshot (e.g., when body width/height are set to 100%, and
  // an internal div is set to value which is larger than the viewport).
  regionInScreenshot.intersect(new Region(0, 0, image.getWidth(), image.getHeight()));
  logger.verbose("Region after intersect: " + regionInScreenshot);
  return regionInScreenshot;
};

/**
 * @private
 * @param {PositionProvider} originProvider
 * @param {Location} requiredPosition
 * @param {int} retries
 * @param {int} waitMillis
 * @param {PromiseFactory} promiseFactory
 * @return {Promise.<Location>}
 */
const _setPositionLoop = async (originProvider, requiredPosition, retries, waitMillis, promiseFactory) => {
  await originProvider.setPosition(requiredPosition);
  // Give the scroll time to stabilize
  await GeneralUtils.sleep(waitMillis, promiseFactory);
  const currentPosition = await originProvider.getCurrentPosition();
  if (!currentPosition.equals(requiredPosition) && (--retries > 0)) {
    return _setPositionLoop(originProvider, requiredPosition, retries, waitMillis, promiseFactory);
  }

  return currentPosition;
};

/**
 * @private
 * @param {DebugScreenshotsProvider} debugScreenshotsProvider
 * @param {MutableImage} image
 * @param {Region} region
 * @param {String} name
 * @return {Promise}
 */
function _saveDebugScreenshotPart(debugScreenshotsProvider, image, region, name) {
  const suffix = `part-${name}-${region.getLeft()}_${region.getTop()}_${region.getWidth()}x${region.getHeight()}`;
  return debugScreenshotsProvider.save(image, suffix);
}

module.exports = FullPageCaptureAlgorithm;
