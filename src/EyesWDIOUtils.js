"use strict";

const EyesSDK = require('eyes.sdk');
const EyesUtils = require('eyes.utils');
const RectangleSize = EyesSDK.RectangleSize;
const MutableImage = EyesSDK.MutableImage;
const CoordinatesType = EyesSDK.CoordinatesType;
const Location = EyesSDK.Location;
const EyesError = EyesSDK.EyesError;
const GeneralUtils = EyesUtils.GeneralUtils;
const GeometryUtils = EyesUtils.GeometryUtils;
const ImageUtils = EyesUtils.ImageUtils;


/*
 ---

 name: EyesWDIOUtils

 description: Handles browser related functionality.

 ---
 */


class EyesWDIOUtils {

  static generateExpression(fn) {
    return '(' + fn.toString() + ')()';
  }


  /**
   * @private
   * @type {string}
   */
  static get JS_GET_VIEWPORT_SIZE() {
    return `
      var height = undefined;
      var width = undefined;
      if (window.innerHeight) {
        height = window.innerHeight;
      } else if (document.documentElement && document.documentElement.clientHeight) {
        height = document.documentElement.clientHeight;
      } else {
        var b = document.getElementsByTagName('body')[0];
        if (b.clientHeight) {
          height = b.clientHeight;
        }
      }

      if (window.innerWidth) {
        width = window.innerWidth;
      } else if (document.documentElement && document.documentElement.clientWidth) {
        width = document.documentElement.clientWidth;
      } else {
        var b = document.getElementsByTagName('body')[0];
        if (b.clientWidth) {
          width = b.clientWidth;
        }
      }
      return [width, height];
    `;
  }

  /**
   * @private
   * @type {string}
   */
  static get JS_GET_CURRENT_SCROLL_POSITION() {
    return "var doc = document.documentElement; " +
      "var x = window.scrollX || ((window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0)); " +
      "var y = window.scrollY || ((window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0)); " +
      "return [x, y];";
  }

  /**
   * @private
   * @type {string}
   */
  static get JS_GET_CONTENT_ENTIRE_SIZE() {
    return "var scrollWidth = document.documentElement.scrollWidth; " +
      "var bodyScrollWidth = document.body.scrollWidth; " +
      "var totalWidth = Math.max(scrollWidth, bodyScrollWidth); " +
      "var clientHeight = document.documentElement.clientHeight; " +
      "var bodyClientHeight = document.body.clientHeight; " +
      "var scrollHeight = document.documentElement.scrollHeight; " +
      "var bodyScrollHeight = document.body.scrollHeight; " +
      "var maxDocElementHeight = Math.max(clientHeight, scrollHeight); " +
      "var maxBodyHeight = Math.max(bodyClientHeight, bodyScrollHeight); " +
      "var totalHeight = Math.max(maxDocElementHeight, maxBodyHeight); " +
      "return [totalWidth, totalHeight];";
  }


  /**
   * @return {string}
   */
  static get JS_GET_IS_BODY_OVERFLOW_HIDDEN() {
    return "var styles = window.getComputedStyle(document.body, null);" +
      "var overflow = styles.getPropertyValue('overflow');" +
      "var overflowX = styles.getPropertyValue('overflow-x');" +
      "var overflowY = styles.getPropertyValue('overflow-y');" +
      "return overflow == 'hidden' || overflowX == 'hidden' || overflowY == 'hidden'";
  }

  /**
   * @private
   * @type {string[]}
   */
  static get JS_TRANSFORM_KEYS() {
    return ["transform", "-webkit-transform"];
  }


  /**
   * Gets the device pixel ratio.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {Promise<number>} A promise which resolves to the device pixel ratio (float type).
   */
  static async getDevicePixelRatio(executor) {
    const result = await executor.executeScript('return window.devicePixelRatio');
    return parseFloat(result.value);
  }

  /**
   * Get the current transform of page.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {Promise.<Object.<String, String>>} A promise which resolves to the current transform value.
   */
  static getCurrentTransform(executor) {
    let script = "return { ";
    for (let i = 0, l = EyesWDIOUtils.JS_TRANSFORM_KEYS.length; i < l; i++) {
      script += `'${EyesWDIOUtils.JS_TRANSFORM_KEYS[i]}': document.documentElement.style['${EyesWDIOUtils.JS_TRANSFORM_KEYS[i]}'],`;
    }
    script += " }";
    return executor.executeScript(script);
  }

  /**
   * Sets transforms for document.documentElement according to the given map of style keys and values.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @param {Object.<String, String>} transforms The transforms to set. Keys are used as style keys and values are the values for those styles.
   * @return {Promise}
   */
  static setTransforms(executor, transforms) {
    let script = '';
    for (const key in transforms) {
      if (transforms.hasOwnProperty(key)) {
        script += `document.documentElement.style['${key}'] = '${transforms[key]}';`;
      }
    }
    return executor.executeScript(script);
  }

  /**
   * Set the given transform to document.documentElement for all style keys defined in {@link JS_TRANSFORM_KEYS}
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @param {String} transform The transform to set.
   * @return {Promise<void>} A promise which resolves to the previous transform once the updated transform is set.
   */
  static setTransform(executor, transform) {
    const transforms = {};
    if (!transform) {
      transform = '';
    }

    for (let transformKey of EyesWDIOUtils.JS_TRANSFORM_KEYS) {
      transforms[transformKey] = transform;
    }

    return EyesWDIOUtils.setTransforms(executor, transforms);
  }

  /**
   * CSS translate the document to a given location.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @param {Location} position The position to translate to.
   * @return {Promise} A promise which resolves to the previous transform when the scroll is executed.
   */
  static translateTo(executor, position) {
    return EyesWDIOUtils.setTransform(executor, `translate(-${position.getX()}px, -${position.getY()}px)`);
  }


  /**
   * Gets the current scroll position.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {Promise.<Location>} The current scroll position of the current frame.
   */
  static async getCurrentScrollPosition(executor) {
    const result = await executor.executeScript(EyesWDIOUtils.JS_GET_CURRENT_SCROLL_POSITION);
    // If we can't find the current scroll position, we use 0 as default.
    return new Location(Math.ceil(result[0]) || 0, Math.ceil(result[1]) || 0);
  }


  /**
   * Get the entire page size.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {RectangleSize} A promise which resolves to an object containing the width/height of the page.
   */
  static async getCurrentFrameContentEntireSize(executor) {
    // IMPORTANT: Notice there's a major difference between scrollWidth and scrollHeight.
    // While scrollWidth is the maximum between an element's width and its content width,
    // scrollHeight might be smaller (!) than the clientHeight, which is why we take the maximum between them.
    try {
      const result = await executor.executeScript(EyesWDIOUtils.JS_GET_CONTENT_ENTIRE_SIZE);
      return new RectangleSize(parseInt(result[0], 10) || 0, parseInt(result[1], 10) || 0);
    } catch (e) {
      throw new EyesError("Failed to extract entire size!", e);
    }
  }


  /**
   * Sets the overflow of the current context's document element.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @param {String} value The overflow value to set.
   * @return {Promise.<String>} The previous value of overflow (could be {@code null} if undefined).
   */
  static setOverflow(executor, value) {
    let script;
    if (value) {
      script =
        "var origOverflow = document.documentElement.style.overflow; " +
        "document.documentElement.style.overflow = \"" + value + "\"; " +
        "return origOverflow";
    } else {
      script =
        "var origOverflow = document.documentElement.style.overflow; " +
        "document.documentElement.style.overflow = undefined; " +
        "return origOverflow";
    }

    return executor.executeScript(script).catch(err => {
      throw new EyesError('Failed to set overflow', err);
    });
  }


  /**
   * Updates the document's body "overflow" value
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @param {String} overflowValue The values of the overflow to set.
   * @return {Promise.<String>} A promise which resolves to the original overflow of the document.
   */
  static setBodyOverflow(executor, overflowValue) {
    let script;
    if (overflowValue === null) {
      script =
        "var origOverflow = document.body.style.overflow; " +
        "document.body.style.overflow = undefined; " +
        "return origOverflow";
    } else {
      script =
        "var origOverflow = document.body.style.overflow; " +
        "document.body.style.overflow = \"" + overflowValue + "\"; " +
        "return origOverflow";
    }

    return executor.executeScript(script).catch(err => {
      throw new EyesError('Failed to set body overflow', err);
    });
  }


  /**
   * Hides the scrollbars of the current context's document element.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @param {int} stabilizationTimeout The amount of time to wait for the "hide scrollbars" action to take effect (Milliseconds). Zero/negative values are ignored.
   * @return {Promise.<String>} The previous value of the overflow property (could be {@code null}).
   */
  static async hideScrollbars(executor, stabilizationTimeout) {
    const result = await EyesWDIOUtils.setOverflow(executor, "hidden");
    if (stabilizationTimeout > 0) {
      await executor.sleep(stabilizationTimeout);
    }
    return result;
  }


  /**
   * Tries to get the viewport size using Javascript. If fails, gets the entire browser window size!
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {RectangleSize} The viewport size.
   */
  static async getViewportSize(executor) {
    const result = await executor.executeScript(EyesWDIOUtils.JS_GET_VIEWPORT_SIZE);
    // const result = await executor.executeScript('return [1,1]');
    return new RectangleSize(parseInt(result.value[0], 10) || 0, parseInt(result.value[1], 10) || 0);
  }

  /**
   * @param {Logger} logger
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {RectangleSize} The viewport size of the current context, or the display size if the viewport size cannot be retrieved.
   */
  static async getViewportSizeOrDisplaySize(logger, executor) {
    try {
      logger.verbose("getViewportSizeOrDisplaySize()");
      return await EyesWDIOUtils.getViewportSize(executor);
    } catch (err) {
      logger.verbose("Failed to extract viewport size using Javascript:", err);

      // If we failed to extract the viewport size using JS, will use the window size instead.
      logger.verbose("Using window size as viewport size.");
      const size = await executor.windowHandleSize();
      logger.verbose(String.format("Done! Size is", size));
      return size;
    }
  }

  /**
   * @param {Logger} logger
   * @param {EyesWebDriver} browser The browser to use.
   * @param {RectangleSize} requiredSize The size to set
   * @return {Promise<boolean>}
   */
  static async setBrowserSize(logger, browser, requiredSize) {
    try {
      await EyesWDIOUtils._setBrowserSize(logger, browser, requiredSize);
      return Promise.resolve(true);
    } catch (ignored) {
      return Promise.resolve(false);
    }
  }


  /**
   * Sets the scroll position of the current frame.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @param {Location} location Location to scroll to
   * @return {Promise} A promise which resolves after the action is performed and timeout passed.
   */
  static setCurrentScrollPosition(executor, location) {
    return executor.executeScript(`window.scrollTo(${location.getY()}, ${location.getY()})`);
  }


  /**
   * @param {Logger} logger
   * @param {EyesWebDriver} browser The browser to use.
   * @param {RectangleSize} requiredSize The size to set
   * @param {number} sleep
   * @param {number} retries
   * @return {Promise<boolean>}
   */
  static async _setBrowserSize(logger, browser, requiredSize, sleep = 1000, retries = 3) {
    try {
      logger.verbose("Trying to set browser size to:", requiredSize);

      await browser.remoteWebDriver.windowHandleSize({
        width: requiredSize.getWidth(),
        height: requiredSize.getHeight()
      });
      await GeneralUtils.sleep(sleep, browser.eyes.getPromiseFactory());

      const size = await browser.remoteWebDriver.windowHandleSize();
      const currentSize = new RectangleSize(size.value.width, size.value.height);
      logger.log(`Current browser size: ${currentSize}`);
      if (currentSize.equals(requiredSize)) {
        return true;
      }

      if (retries === 0) {
        return browser.eyes.getPromiseFactory().reject("Failed to set browser size: retries is out.");
      }

      return await EyesWDIOUtils._setBrowserSize(logger, browser, requiredSize, sleep, retries - 1);
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * @param {Logger} logger
   * @param {EyesWebDriver} browser The browser to use.
   * @param {RectangleSize} actualViewportSize
   * @param {RectangleSize} requiredViewportSize
   * @return {Promise<boolean>}
   */
  static async setBrowserSizeByViewportSize(logger, browser, actualViewportSize, requiredViewportSize) {
    try {
      const browserSize = await browser.remoteWebDriver.windowHandleSize();
      logger.verbose("Current browser size:", browserSize);
      const requiredBrowserSize = {
        width: browserSize.value.width + (requiredViewportSize.getWidth() - actualViewportSize.getWidth()),
        height: browserSize.value.height + (requiredViewportSize.getHeight() - actualViewportSize.getHeight())
      };
      return EyesWDIOUtils.setBrowserSize(logger, browser, new RectangleSize(requiredBrowserSize));
    } catch (e) {
      throw e;
    }
  }

  /**
   * Tries to set the viewport
   *
   * @param {Logger} logger
   * @param {EyesWebDriver} browser The browser to use.
   * @param {RectangleSize} requiredSize The viewport size.
   * @returns {Promise<void>}
   */
  static async setViewportSize(logger, browser, requiredSize) {
    // First we will set the window size to the required size.
    // Then we'll check the viewport size and increase the window size accordingly.
    logger.verbose("setViewportSize(", requiredSize, ")");

    let jsExecutor = browser.eyes.jsExecutor;
    let actualViewportSize = await EyesWDIOUtils.getViewportSize(jsExecutor);
    logger.verbose("Initial viewport size:", actualViewportSize);

    // If the viewport size is already the required size
    if (actualViewportSize.equals(requiredSize)) {
      return browser.eyes.getPromiseFactory().resolve();
    }

    // We move the window to (0,0) to have the best chance to be able to
    // set the viewport size as requested.
    try {
      await browser.remoteWebDriver.windowHandlePosition({x: 0, y: 0});
    } catch (ignored) {
      logger.verbose("Warning: Failed to move the browser window to (0,0)");
    }

    await EyesWDIOUtils.setBrowserSizeByViewportSize(logger, browser, actualViewportSize, requiredSize);

    actualViewportSize = await EyesWDIOUtils.getViewportSize(jsExecutor);

    if (actualViewportSize.equals(requiredSize)) {
      return browser.eyes.getPromiseFactory().resolve();
    }

    // Additional attempt. This Solves the "maximized browser" bug
    // (border size for maximized browser sometimes different than non-maximized, so the original browser size calculation is wrong).
    logger.verbose("Trying workaround for maximization...");
    await EyesWDIOUtils.setBrowserSizeByViewportSize(logger, browser, actualViewportSize, requiredSize);
    actualViewportSize = await EyesWDIOUtils.getViewportSize(jsExecutor);
    logger.verbose("Current viewport size:", actualViewportSize);

    if (actualViewportSize.equals(requiredSize)) {
      return browser.eyes.getPromiseFactory().resolve();
    }

    const MAX_DIFF = 3;
    const widthDiff = actualViewportSize.getWidth() - requiredSize.getWidth();
    const widthStep = widthDiff > 0 ? -1 : 1; // -1 for smaller size, 1 for larger
    const heightDiff = actualViewportSize.getHeight() - requiredSize.getHeight();
    const heightStep = heightDiff > 0 ? -1 : 1;

    const browserSize = await browser.remoteWebDriver.windowHandleSize();

    const currWidthChange = 0;
    const currHeightChange = 0;
    // We try the zoom workaround only if size difference is reasonable.
    if (Math.abs(widthDiff) <= MAX_DIFF && Math.abs(heightDiff) <= MAX_DIFF) {
      logger.verbose("Trying workaround for zoom...");
      const retriesLeft = Math.abs((widthDiff === 0 ? 1 : widthDiff) * (heightDiff === 0 ? 1 : heightDiff)) * 2;
      const lastRequiredBrowserSize = null;
      try {
        await EyesWDIOUtils._setWindowSize(logger, browser, requiredSize, actualViewportSize, browserSize,
          widthDiff, widthStep, heightDiff, heightStep, currWidthChange, currHeightChange,
          retriesLeft, lastRequiredBrowserSize);
        return browser.eyes.getPromiseFactory().resolve();
      } catch (e) {
        throw new EyesError("Failed to set viewport size: zoom workaround failed.");
      }
    } else {
      throw new EyesError("Failed to set viewport size!");
    }
  }

  /**
   * @private
   * @param {Logger} logger
   * @param {EyesWebDriver} browser
   * @param {RectangleSize} requiredSize
   * @param actualViewportSize
   * @param browserSize
   * @param widthDiff
   * @param widthStep
   * @param heightDiff
   * @param heightStep
   * @param currWidthChange
   * @param currHeightChange
   * @param retriesLeft
   * @param {RectangleSize} lastRequiredBrowserSize
   * @return {Promise<void>}
   */
  static async _setWindowSize(logger,
                              browser,
                              requiredSize,
                              actualViewportSize,
                              browserSize,
                              widthDiff,
                              widthStep,
                              heightDiff,
                              heightStep,
                              currWidthChange,
                              currHeightChange,
                              retriesLeft,
                              lastRequiredBrowserSize) {
    logger.verbose("Retries left: " + retriesLeft);
    // We specifically use "<=" (and not "<"), so to give an extra resize attempt
    // in addition to reaching the diff, due to floating point issues.
    if (Math.abs(currWidthChange) <= Math.abs(widthDiff) && actualViewportSize.getWidth() !== requiredSize.getWidth()) {
      currWidthChange += widthStep;
    }

    if (Math.abs(currHeightChange) <= Math.abs(heightDiff) && actualViewportSize.getHeight() !== requiredSize.getHeight()) {
      currHeightChange += heightStep;
    }

    const requiredBrowserSize = new RectangleSize(browserSize.width + currWidthChange, browserSize.height + currHeightChange);

    if (lastRequiredBrowserSize && requiredBrowserSize.equals(lastRequiredBrowserSize)) {
      logger.verbose("Browser size is as required but viewport size does not match!");
      logger.verbose("Browser size: " + requiredBrowserSize + " , Viewport size: " + actualViewportSize);
      logger.verbose("Stopping viewport size attempts.");
      return browser.eyes.getPromiseFactory().resolve();
    }

    await EyesWDIOUtils.setBrowserSize(logger, browser, requiredBrowserSize);
    lastRequiredBrowserSize = requiredBrowserSize;
    actualViewportSize = EyesWDIOUtils.getViewportSize(browser.eyes.jsExecutor);

    logger.verbose("Current viewport size:", actualViewportSize);
    if (actualViewportSize.equals(requiredSize)) {
      return browser.eyes.getPromiseFactory().resolve();
    }

    if ((Math.abs(currWidthChange) <= Math.abs(widthDiff) || Math.abs(currHeightChange) <= Math.abs(heightDiff)) && (--retriesLeft > 0)) {
      return EyesWDIOUtils._setWindowSize(logger, browser, requiredSize, actualViewportSize, browserSize,
        widthDiff, widthStep, heightDiff, heightStep, currWidthChange, currHeightChange,
        retriesLeft, lastRequiredBrowserSize);
    }

    throw new EyesError("Failed to set window size!");
  }

  /**
   * @private
   * @param {{left: number, top: number, width: number, height: number}} part
   * @param {Array<{position: {x: number, y: number}, size: {width: number, height: number}, image: Buffer}>} parts
   * @param {{imageBuffer: Buffer, width: number, height: number}} imageObj
   * @param {EyesWebDriver} browser
   * @param {Promise<void>} promise
   * @param {PromiseFactory} promiseFactory
   * @param {{width: number, height: number}} viewportSize
   * @param {PositionProvider} positionProvider
   * @param {ScaleProviderFactory} scaleProviderFactory
   * @param {CutProvider} cutProvider
   * @param {{width: number, height: number}} entirePageSize
   * @param {number} pixelRatio
   * @param {number} rotationDegrees
   * @param {boolean} automaticRotation
   * @param {number} automaticRotationDegrees
   * @param {boolean} isLandscape
   * @param {int} waitBeforeScreenshots
   * @param {{left: number, top: number, width: number, height: number}} regionInScreenshot
   * @param {boolean} [saveDebugScreenshots=false]
   * @param {string} [debugScreenshotsPath=null]
   * @return {Promise<void>}
   */
  static _processPart(part, parts, imageObj, browser, promise, promiseFactory, viewportSize, positionProvider,
                      scaleProviderFactory, cutProvider, entirePageSize, pixelRatio, rotationDegrees,
                      automaticRotation, automaticRotationDegrees, isLandscape, waitBeforeScreenshots,
                      regionInScreenshot, saveDebugScreenshots, debugScreenshotsPath) {
    return promise.then(function () {
      return promiseFactory.makePromise(function (resolve) {
        // Skip 0,0 as we already got the screenshot
        if (part.left === 0 && part.top === 0) {
          parts.push({
            image: imageObj.imageBuffer,
            size: {width: imageObj.width, height: imageObj.height},
            position: {x: 0, y: 0}
          });

          resolve();
          return;
        }

        const partPosition = {x: part.left, y: part.top};
        return positionProvider.setPosition(partPosition).then(function () {
          return positionProvider.getCurrentPosition();
        }).then(function (currentPosition) {
          return EyesWDIOUtils._captureViewport(browser, viewportSize, scaleProviderFactory, cutProvider, entirePageSize,
            pixelRatio, rotationDegrees, automaticRotation, automaticRotationDegrees, isLandscape,
            waitBeforeScreenshots, regionInScreenshot, saveDebugScreenshots, debugScreenshotsPath).then(function (partImage) {
            return partImage.asObject();
          }).then(function (partObj) {
            parts.push({
              image: partObj.imageBuffer,
              size: {width: partObj.width, height: partObj.height},
              position: {x: currentPosition.x, y: currentPosition.y}
            });

            resolve();
          });
        });
      });
    });
  }

  /**
   * @private
   * @param {EyesWebDriver} browser
   * @param {{width: number, height: number}} viewportSize
   * @param {ScaleProviderFactory} scaleProviderFactory
   * @param {CutProvider} cutProvider
   * @param {{width: number, height: number}} entirePageSize
   * @param {number} pixelRatio
   * @param {number} rotationDegrees
   * @param {boolean} automaticRotation
   * @param {number} automaticRotationDegrees
   * @param {boolean} isLandscape
   * @param {int} waitBeforeScreenshots
   * @param {{left: number, top: number, width: number, height: number}} [regionInScreenshot]
   * @param {boolean} [saveDebugScreenshots=false]
   * @param {string} [debugScreenshotsPath=null]
   * @return {Promise<MutableImage>}
   */
  static _captureViewport(browser,
                          viewportSize,
                          scaleProviderFactory,
                          cutProvider,
                          entirePageSize,
                          pixelRatio,
                          rotationDegrees,
                          automaticRotation,
                          automaticRotationDegrees,
                          isLandscape,
                          waitBeforeScreenshots,
                          regionInScreenshot,
                          saveDebugScreenshots,
                          debugScreenshotsPath) {
    const promiseFactory = browser.eyes.getPromiseFactory();

    let mutableImage, scaleRatio = 1;
    return GeneralUtils.sleep(waitBeforeScreenshots, promiseFactory).then(function () {
      return Promise.resolve(browser.remoteWebDriver.saveScreenshot()).then(function (screenshot64) {
        return new MutableImage(new Buffer(screenshot64, 'base64'), promiseFactory);
      }).then(function (image) {
        mutableImage = image;
        if (saveDebugScreenshots) {
          const filename = "screenshot " + (new Date()).getTime() + " original.png";
          return mutableImage.saveImage(debugScreenshotsPath + filename.replace(/ /g, '_'));
        }
      }).then(function () {
        if (cutProvider) {
          return cutProvider.cut(mutableImage).then(function (image) {
            mutableImage = image;
          });
        }
      }).then(function () {
        return mutableImage.getSize();
      }).then(function (imageSize) {
        if (isLandscape && automaticRotation && imageSize.getHeight() > imageSize.getWidth()) {
          rotationDegrees = automaticRotationDegrees;
        }

        if (scaleProviderFactory) {
          const scaleProvider = scaleProviderFactory.getScaleProvider(imageSize.getWidth());
          scaleRatio = scaleProvider.getScaleRatio();
        }

        // todo
        if (regionInScreenshot) {
          const scaledRegion = GeometryUtils.scaleRegion(regionInScreenshot, 1 / scaleRatio);
          return mutableImage.cropImage(scaledRegion);
        }
      }).then(function () {
        if (saveDebugScreenshots) {
          const filename = "screenshot " + (new Date()).getTime() + " cropped.png";
          return mutableImage.saveImage(debugScreenshotsPath + filename.replace(/ /g, '_'));
        }
      }).then(function () {
        if (scaleRatio !== 1) {
          return mutableImage.scale(scaleRatio);
        }
      }).then(function () {
        if (saveDebugScreenshots) {
          const filename = "screenshot " + (new Date()).getTime() + " scaled.png";
          return mutableImage.saveImage(debugScreenshotsPath + filename.replace(/ /g, '_'));
        }
      }).then(function () {
        if (rotationDegrees !== 0) {
          return mutableImage.rotateImage(rotationDegrees);
        }
      }).then(function () {
        return mutableImage.getSize();
      }).then(function (imageSize) {
        // If the image is a viewport screenshot, we want to save the current scroll position (we'll need it for check region).
        if (imageSize.getWidth() <= viewportSize.getWidth() && imageSize.getHeight() <= viewportSize.getHeight()) {
          return EyesWDIOUtils.getCurrentScrollPosition(browser, promiseFactory).then(function (scrollPosition) {
            return mutableImage.setCoordinates(scrollPosition);
          }, function () {
            // Failed to get Scroll position, setting coordinates to default.
            return mutableImage.setCoordinates(new Location(0, 0));
          });
        }
      }).then(function () {
        return mutableImage;
      });
    });
  }

  /**
   * Capture screenshot from given driver
   *
   * @param {EyesWebDriver} browser
   * @param {{width: number, height: number}} viewportSize
   * @param {PositionProvider} positionProvider
   * @param {ScaleProviderFactory} scaleProviderFactory
   * @param {CutProvider} cutProvider
   * @param {boolean} fullPage
   * @param {boolean} hideScrollbars
   * @param {boolean} useCssTransition
   * @param {number} rotationDegrees
   * @param {boolean} automaticRotation
   * @param {number} automaticRotationDegrees
   * @param {boolean} isLandscape
   * @param {int} waitBeforeScreenshots
   * @param {boolean} checkFrameOrElement
   * @param {RegionProvider} [regionProvider]
   * @param {boolean} [saveDebugScreenshots=false]
   * @param {string} [debugScreenshotsPath=null]
   * @returns {Promise<MutableImage>}
   */
  static getScreenshot(browser, viewportSize, positionProvider, scaleProviderFactory,
                       cutProvider, fullPage, hideScrollbars, useCssTransition, rotationDegrees, automaticRotation,
                       automaticRotationDegrees, isLandscape,
                       waitBeforeScreenshots, checkFrameOrElement,
                       regionProvider, saveDebugScreenshots, debugScreenshotsPath) {
    const promiseFactory = browser.eyes.getPromiseFactory();
    const jsExecutor = browser.eyes.jsExecutor;

    const MIN_SCREENSHOT_PART_HEIGHT = 10,
      MAX_SCROLLBAR_SIZE = 50;
    let originalPosition,
      originalOverflow,
      originalBodyOverflow,
      entirePageSize,
      regionInScreenshot,
      pixelRatio,
      imageObject,
      screenshot;

    hideScrollbars = hideScrollbars === null ? useCssTransition : hideScrollbars;

    // step #1 - get entire page size for future use (scaling and stitching)
    return positionProvider.getEntireSize().then(function (pageSize) {
      entirePageSize = pageSize;
    }, function () {
      // Couldn't get entire page size, using viewport size as default.
      entirePageSize = viewportSize;
    }).then(function () {
      // step #2 - get the device pixel ratio (scaling)
      return EyesWDIOUtils.getDevicePixelRatio(jsExecutor).then(function (ratio) {
        pixelRatio = ratio;
      }, function () {
        // Couldn't get pixel ratio, using 1 as default.
        pixelRatio = 1;
      });
    }).then(function () {
      // step #3 - hide the scrollbars if instructed
      if (hideScrollbars) {
        return EyesWDIOUtils.setOverflow(jsExecutor, "hidden").then(function (originalVal) {
          originalOverflow = originalVal;

          if (useCssTransition) {
            return jsExecutor.executeScript(EyesWDIOUtils.JS_GET_IS_BODY_OVERFLOW_HIDDEN).then(function (isBodyOverflowHidden) {
              if (isBodyOverflowHidden) {
                return EyesWDIOUtils.setBodyOverflow(jsExecutor, "initial").then(function (originalBodyVal) {
                  originalBodyOverflow = originalBodyVal;
                });
              }
            });
          }
        });
      }
    }).then(function () {
      // step #4 - if this is a full page screenshot we need to scroll to position 0,0 before taking the first
      if (fullPage) {
        return positionProvider.getState().then(function (state) {
          originalPosition = state;
          return positionProvider.setPosition(new Location({x: 0, y: 0}));
        }).then(function () {
          return positionProvider.getCurrentPosition();
        }).then(function (location) {
          if (location.getX() !== 0 || location.getY() !== 0) {
            throw new Error("Could not scroll to the x/y corner of the screen");
          }
        });
      }
    }).then(function () {
      if (regionProvider) {
        return EyesWDIOUtils._captureViewport(browser, viewportSize, scaleProviderFactory, cutProvider, entirePageSize, pixelRatio,
          rotationDegrees, automaticRotation, automaticRotationDegrees, isLandscape, waitBeforeScreenshots).then(function (image) {
          return regionProvider.getRegionInLocation(image, CoordinatesType.SCREENSHOT_AS_IS, promiseFactory);
        }).then(function (region) {
          regionInScreenshot = region;
        });
      }
    }).then(function () {
      // step #5 - Take screenshot of the 0,0 tile / current viewport
      return EyesWDIOUtils._captureViewport(browser, viewportSize, scaleProviderFactory, cutProvider,
        entirePageSize, pixelRatio, rotationDegrees, automaticRotation, automaticRotationDegrees, isLandscape,
        waitBeforeScreenshots, checkFrameOrElement ? regionInScreenshot : null, saveDebugScreenshots, debugScreenshotsPath)
        .then(function (image) {
          screenshot = image;
          return screenshot.asObject();
        }).then(function (imageObj) {
          imageObject = imageObj;
        });
    }).then(function () {
      return promiseFactory.makePromise(function (resolve) {
        if (!fullPage && !checkFrameOrElement) {
          resolve();
          return;
        }
        // IMPORTANT This is required! Since when calculating the screenshot parts for full size,
        // we use a screenshot size which is a bit smaller (see comment below).
        if (imageObject.width >= entirePageSize.getWidth() && imageObject.height >= entirePageSize.getHeight()) {
          resolve();
          return;
        }

        // We use a smaller size than the actual screenshot size in order to eliminate duplication
        // of bottom scroll bars, as well as footer-like elements with fixed position.
        const screenshotPartSize = {
          width: imageObject.width,
          height: Math.max(imageObject.height - MAX_SCROLLBAR_SIZE, MIN_SCREENSHOT_PART_HEIGHT)
        };

        const screenshotParts = GeometryUtils.getSubRegions({
          left: 0, top: 0, width: entirePageSize.width,
          height: entirePageSize.height
        }, screenshotPartSize, false);

        const parts = [];
        let promise = promiseFactory.makePromise(function (resolve) {
          resolve();
        });

        screenshotParts.forEach(function (part) {
          promise = EyesWDIOUtils._processPart(part, parts, imageObject, browser, promise, promiseFactory,
            viewportSize, positionProvider, scaleProviderFactory, cutProvider, entirePageSize, pixelRatio, rotationDegrees, automaticRotation,
            automaticRotationDegrees, isLandscape, waitBeforeScreenshots, checkFrameOrElement ? regionInScreenshot : null, saveDebugScreenshots, debugScreenshotsPath);
        });
        promise.then(function () {
          return ImageUtils.stitchImage(entirePageSize, parts, promiseFactory).then(function (stitchedBuffer) {
            screenshot = new MutableImage(stitchedBuffer, promiseFactory);
            resolve();
          });
        });
      });
    }).then(function () {
      if (hideScrollbars) {
        return EyesWDIOUtils.setOverflow(jsExecutor, originalOverflow);
      }
    }).then(function () {
      if (originalBodyOverflow) {
        return EyesWDIOUtils.setBodyOverflow(jsExecutor, originalBodyOverflow);
      }
    }).then(function () {
      if (fullPage) {
        return positionProvider.restoreState(originalPosition);
      }
    }).then(function () {
      if (!checkFrameOrElement && regionInScreenshot) {
        return screenshot.cropImage(regionInScreenshot);
      }
    }).then(function () {
      return screenshot;
    });
  }

}

module.exports = EyesWDIOUtils;
