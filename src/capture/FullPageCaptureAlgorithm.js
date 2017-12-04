'use strict';

const {ArgumentGuard, Location, Region, RectangleSize, CoordinatesType, GeneralUtils, MutableImage, NullCutProvider} = require('eyes.sdk');

const NullRegionPositionCompensation = require('../positioning/NullRegionPositionCompensation');

const MIN_SCREENSHOT_PART_HEIGHT = 10;

class FullPageCaptureAlgorithm {

    /**
     * @param {Logger} logger
     * @param {UserAgent} userAgent
     * @param {PromiseFactory} promiseFactory
     */
    constructor(logger, userAgent, promiseFactory) {
        ArgumentGuard.notNull(logger, "logger");
        // ArgumentGuard.notNull(userAgent, "userAgent");
        ArgumentGuard.notNull(promiseFactory, "promiseFactory");

        this._logger = logger;
        this._userAgent = userAgent;
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
    getStitchedRegion(imageProvider, region, originProvider, positionProvider, scaleProviderFactory, cutProvider, waitBeforeScreenshots, debugScreenshotsProvider, screenshotFactory, stitchingOverlap, regionPositionCompensation) {
        this._logger.verbose("getStitchedRegion()");

        ArgumentGuard.notNull(region, "region");
        ArgumentGuard.notNull(originProvider, "originProvider");
        ArgumentGuard.notNull(positionProvider, "positionProvider");

        this._logger.verbose(`getStitchedRegion: originProvider: ${originProvider.constructor.name} ; positionProvider: ${positionProvider.constructor.name} ; cutProvider: ${cutProvider.constructor.name}`);
        this._logger.verbose(`Region to check: ${region}`);

        const that = this;
        let originalPosition, currentPosition, /** @type {MutableImage} */ image, scaleProvider, pixelRatio, regionInScreenshot, entireSize;

        // Saving the original position (in case we were already in the outermost frame).
        return originProvider.getState().then(originalPosition_ => {
            originalPosition = originalPosition_;

            return _setPositionLoop(originProvider, new Location(0, 0), 3, waitBeforeScreenshots, that._promiseFactory).then(currentPosition_ => {
                currentPosition = currentPosition_;

                if (currentPosition.getX() !== 0 || currentPosition.getY() !== 0) {
                    return originProvider.restoreState(originalPosition).then(() => {
                        throw new Error("Couldn't set position to the top/left corner!");
                    });
                }
            });
        }).then(() => {
            that._logger.verbose("Getting top/left image...");
            return imageProvider.getImage().then(image_ => {
                image = image_;
                return debugScreenshotsProvider.save(image, "original");
            });
        }).then(() => {
            // FIXME - scaling should be refactored
            scaleProvider = scaleProviderFactory.getScaleProvider(image.getWidth());
            // Notice that we want to cut/crop an image before we scale it, we need to change
            pixelRatio = 1 / scaleProvider.getScaleRatio();

            // FIXME - cropping should be overlaid, so a single cut provider will only handle a single part of the image.
            cutProvider = cutProvider.scale(pixelRatio);
            if (!(cutProvider instanceof NullCutProvider)) {
                return cutProvider.cut(image).then(image_ => {
                    image = image_;
                    return debugScreenshotsProvider.save(image, "original-cut");
                });
            }
        }).then(() => {
            that._logger.verbose("Done! Creating screenshot object...");

            // We need the screenshot to be able to convert the region to screenshot coordinates.
            return screenshotFactory.makeScreenshot(image);
        }).then(screenshot => {
            that._logger.verbose("Done! Getting region in screenshot...");

            regionInScreenshot = _getRegionInScreenshot(that._logger, region, image, pixelRatio, screenshot, regionPositionCompensation);

            if (!regionInScreenshot.getSize().equals(region.getSize())) {
                regionInScreenshot = _getRegionInScreenshot(that._logger, region, image, pixelRatio, screenshot, regionPositionCompensation);
            }

            if (!regionInScreenshot.isEmpty()) {
                return image.getImagePart(regionInScreenshot).then(image_ => {
                    image = image_;
                    return _saveDebugScreenshotPart(debugScreenshotsProvider, image, region, "cropped");
                });
            }
        }).then(() => {
            if (pixelRatio !== 1) {
                return image.scale(scaleProvider.getScaleRatio()).then(image_ => {
                    image = image_;
                    return debugScreenshotsProvider.save(image, "scaled");
                });
            }
        }).then(() => {
            return positionProvider.getEntireSize().then(entireSize_ => {
                entireSize = entireSize_;
                that._logger.verbose("Entire size of region context: " + entireSize);
            }).catch(err => {
                that._logger.log("WARNING: Failed to extract entire size of region context" + err);
                that._logger.log("Using image size instead: " + image.getWidth() + "x" + image.getHeight());
                entireSize = new RectangleSize(image.getWidth(), image.getHeight());
            });
        }).then(() => {
            // Notice that this might still happen even if we used "getImagePart", since "entirePageSize" might be that of a frame.
            if (image.getWidth() >= entireSize.getWidth() && image.getHeight() >= entireSize.getHeight()) {
                return originProvider.restoreState(originalPosition).then(() => image);
            }

            // These will be used for storing the actual stitched size (it is sometimes less than the size extracted via "getEntireSize").
            let lastSuccessfulLocation, lastSuccessfulPartSize, originalStitchedState, /** @type {MutableImage} */ partImage;

            // The screenshot part is a bit smaller than the screenshot size, in order to eliminate duplicate bottom scroll bars, as well as fixed position footers.
            const partImageSize = new RectangleSize(image.getWidth(), Math.max(image.getHeight() - stitchingOverlap, MIN_SCREENSHOT_PART_HEIGHT));

            that._logger.verbose(`"Total size: ${entireSize}, image part size: ${partImageSize}`);

            // Getting the list of sub-regions composing the whole region (we'll take screenshot for each one).
            const entirePage = new Region(Location.ZERO, entireSize);
            const imageParts = entirePage.getSubRegions(partImageSize);

            that._logger.verbose("Creating stitchedImage container. Size: " + entireSize);

            //Notice stitchedImage uses the same type of image as the screenshots.
            let stitchedImage = MutableImage.newImage(entireSize.getWidth(), entireSize.getHeight(), that._promiseFactory);

            that._logger.verbose("Done! Adding initial screenshot..");
            // Starting with the screenshot we already captured at (0,0).
            that._logger.verbose(`Initial part:(0,0)[${image.getWidth()} x ${image.getHeight()}]`);

            return stitchedImage.copyRasterData(0, 0, image).then(() => {
                that._logger.verbose("Done!");

                lastSuccessfulLocation = new Location(0, 0);
                lastSuccessfulPartSize = new RectangleSize(image.getWidth(), image.getHeight());

                return positionProvider.getState().then(originalStitchedState_ => {
                    originalStitchedState = originalStitchedState_;
                });
            }).then(() => {
                // Take screenshot and stitch for each screenshot part.
                that._logger.verbose("Getting the rest of the image parts...");

                return imageParts.reduce((promise, partRegion) => {
                    return promise.then(() => {
                        // Skipping screenshot for 0,0 (already taken)
                        if (partRegion.getLeft() === 0 && partRegion.getTop() === 0) {
                            return;
                        }

                        that._logger.verbose("Taking screenshot for " + partRegion);

                        // Set the position to the part's top/left.
                        return positionProvider.setPosition(partRegion.getLocation()).then(() => {
                            // Giving it time to stabilize.
                            return GeneralUtils.sleep(waitBeforeScreenshots, that._promiseFactory);
                        }).then(() => {
                            // Screen size may cause the scroll to only reach part of the way.
                            return positionProvider.getCurrentPosition().then(currentPosition_ => {
                                currentPosition = currentPosition_;
                                that._logger.verbose("Set position to " + currentPosition);
                            });
                        }).then(() => {
                            // Actually taking the screenshot.
                            that._logger.verbose("Getting image...");
                            return imageProvider.getImage().then(partImage_ => {
                                partImage = partImage_;
                                return debugScreenshotsProvider.save(partImage, "original-scrolled-" + currentPosition.toStringForFilename());
                            });
                        }).then(() => {
                            // FIXME - cropping should be overlaid (see previous comment re cropping)
                            if (!(cutProvider instanceof NullCutProvider)) {
                                that._logger.verbose("cutting...");
                                return cutProvider.cut(partImage).then(partImage_ => {
                                    partImage = partImage_;
                                    return debugScreenshotsProvider.save(partImage, "original-scrolled-cut-" + currentPosition.toStringForFilename());
                                });
                            }
                        }).then(() => {
                            if (!regionInScreenshot.isEmpty()) {
                                that._logger.verbose("cropping...");
                                return partImage.getImagePart(regionInScreenshot).then(partImage_ => {
                                    partImage = partImage_;
                                    return _saveDebugScreenshotPart(debugScreenshotsProvider, partImage, partRegion, "original-scrolled-" + currentPosition.toStringForFilename());
                                });
                            }
                        }).then(() => {
                            if (pixelRatio !== 1) {
                                that._logger.verbose("scaling...");
                                // FIXME - scaling should be refactored
                                return partImage.scale(scaleProvider.getScaleRatio()).then(partImage_ => {
                                    partImage = partImage_;
                                    return _saveDebugScreenshotPart(debugScreenshotsProvider, partImage, partRegion, "original-scrolled-" + currentPosition.toStringForFilename() + "-scaled-");
                                });
                            }
                        }).then(() => {
                            that._logger.verbose("Stitching part into the image container...");

                            // Stitching the current part.
                            return stitchedImage.copyRasterData(currentPosition.getX(), currentPosition.getY(), partImage);
                        }).then(() => {
                            that._logger.verbose("Done!");
                            lastSuccessfulLocation = currentPosition;
                        });
                    });
                }, that._promiseFactory.resolve());
            }).then(() => {
                if (partImage) {
                    lastSuccessfulPartSize = new RectangleSize(partImage.getWidth(), partImage.getHeight());
                }

                that._logger.verbose("Stitching done!");
            }).then(() => {
                return positionProvider.restoreState(originalStitchedState);
            }).then(() => {
                return originProvider.restoreState(originalPosition);
            }).then(() => {
                // If the actual image size is smaller than the extracted size, we crop the image.
                const actualImageWidth = lastSuccessfulLocation.getX() + lastSuccessfulPartSize.getWidth();
                const actualImageHeight = lastSuccessfulLocation.getY() + lastSuccessfulPartSize.getHeight();
                that._logger.verbose("Extracted entire size: " + entireSize);
                that._logger.verbose("Actual stitched size: " + actualImageWidth + "x" + actualImageHeight);

                if (actualImageWidth < stitchedImage.getWidth() || actualImageHeight < stitchedImage.getHeight()) {
                    that._logger.verbose("Trimming unnecessary margins..");
                    const region = new Region(0, 0, Math.min(actualImageWidth, stitchedImage.getWidth()), Math.min(actualImageHeight, stitchedImage.getHeight()));
                    return stitchedImage.getImagePart(region).then(stitchedImage_ => {
                        stitchedImage = stitchedImage_;
                        that._logger.verbose("Done!");
                    });
                }
            }).then(() => {
                return debugScreenshotsProvider.save(stitchedImage, "stitched");
            }).then(() => {
                return stitchedImage;
            });
        });
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
function _getRegionInScreenshot(logger, region, image, pixelRatio, screenshot, regionPositionCompensation) {
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
}

/**
 * @private
 * @param {PositionProvider} originProvider
 * @param {Location} requiredPosition
 * @param {int} retries
 * @param {int} waitMillis
 * @param {PromiseFactory} promiseFactory
 * @return {Promise.<Location>}
 */
function _setPositionLoop(originProvider, requiredPosition, retries, waitMillis, promiseFactory) {
    return originProvider.setPosition(requiredPosition).then(() => {
        // Give the scroll time to stabilize
        return GeneralUtils.sleep(waitMillis, promiseFactory);
    }).then(() => {
        return originProvider.getCurrentPosition();
    }).then(currentPosition => {
        if (!currentPosition.equals(requiredPosition) && (--retries > 0)) {
            return _setPositionLoop(originProvider, requiredPosition, retries, waitMillis, promiseFactory);
        }

        return currentPosition;
    });
}

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
