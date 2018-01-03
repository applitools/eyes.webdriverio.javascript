"use strict";

const {Location, RectangleSize, ArgumentGuard} = require('eyes.sdk');

const EyesUtils = require('eyes.utils');
const GeneralUtils = EyesUtils.GeneralUtils;

const EyesDriverOperationError = require('./errors/EyesDriverOperationError');
const ImageOrientationHandler = require('./ImageOrientationHandler');
const JavascriptHandler = require('./JavascriptHandler');

/*
 ---

 name: EyesWDIOUtils

 description: Handles browser related functionality.

 ---
 */

let imageOrientationHandler = new class ImageOrientationHandlerImpl extends ImageOrientationHandler {
  /** @override */
  async isLandscapeOrientation(driver) {
    try {
      const orientation = await driver.remoteWebDriver.getOrientation();
      return orientation === 'landscape';
    } catch (e) {
      throw new EyesDriverOperationError("Failed to get orientation!", e);
    }
  }

  /** @override */
  async tryAutomaticRotation(logger, driver, image) {
    const {value: res} = await driver.execute(() => 0);
    return res;
  }
};

let javascriptHandler = new class JavascriptHandlerImpl extends JavascriptHandler {
  /** @override */
  handle(script, ...args) {
    throw new Error('You should init javascriptHandler before, using setJavascriptHandler method.');
  }
};


class EyesWDIOUtils {


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
    return `var scrollWidth = document.documentElement.scrollWidth;
      var bodyScrollWidth = document.body.scrollWidth; 
      var totalWidth = Math.max(scrollWidth, bodyScrollWidth); 
      var clientHeight = document.documentElement.clientHeight;
      var bodyClientHeight = document.body.clientHeight; 
      var scrollHeight = document.documentElement.scrollHeight;
      var bodyScrollHeight = document.body.scrollHeight;
      var maxDocElementHeight = Math.max(clientHeight, scrollHeight);
      var maxBodyHeight = Math.max(bodyClientHeight, bodyScrollHeight);
      var totalHeight = Math.max(maxDocElementHeight, maxBodyHeight);
      return [totalWidth, totalHeight];`;
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
    const {value: result} = await executor.executeScript('return window.devicePixelRatio');
    return parseFloat(result);
  }

  /**
   * Get the current transform of page.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {Promise.<Object.<String, String>>} A promise which resolves to the current transform value.
   */
  static async getCurrentTransform(executor) {
    let script = "return { ";
    for (let i = 0, l = EyesWDIOUtils.JS_TRANSFORM_KEYS.length; i < l; i++) {
      script += `'${EyesWDIOUtils.JS_TRANSFORM_KEYS[i]}': document.documentElement.style['${EyesWDIOUtils.JS_TRANSFORM_KEYS[i]}'],`;
    }
    script += " }";
    const {value: result} = await executor.executeScript(script);
    return result;
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
   * @param {Logger} logger
   * @param {WebDriver} driver
   * @param {MutableImage} image
   * @returns {Promise.<int>}
   */
  static tryAutomaticRotation(logger, driver, image){
    return imageOrientationHandler.tryAutomaticRotation(logger, driver, image);
  }


  /**
   * Gets the current scroll position.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {Promise.<Location>} The current scroll position of the current frame.
   */
  static async getCurrentScrollPosition(executor) {
    const {value} = await executor.executeScript(EyesWDIOUtils.JS_GET_CURRENT_SCROLL_POSITION);
    // If we can't find the current scroll position, we use 0 as default.
    return new Location(Math.ceil(value[0]) || 0, Math.ceil(value[1]) || 0);
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
      const {value} = await executor.executeScript(EyesWDIOUtils.JS_GET_CONTENT_ENTIRE_SIZE);
      return new RectangleSize(parseInt(value[0], 10) || 0, parseInt(value[1], 10) || 0);
    } catch (e) {
      throw new EyesDriverOperationError("Failed to extract entire size!", e);
    }
  }


  /**
   * Sets the overflow of the current context's document element.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @param {String} value The overflow value to set.
   * @return {Promise.<String>} The previous value of overflow (could be {@code null} if undefined).
   */
  static async setOverflow(executor, value) {
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

    try {
      const {value: result} = await executor.executeScript(script);
      return result;
    } catch (e) {
      throw new EyesDriverOperationError('Failed to set overflow', e);
    }
  }


  /**
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {Promise.<Boolean>} A promise which resolves to the {@code true} if body overflow is hidden, {@code false} otherwise.
   */
   static async isBodyOverflowHidden(executor) {
    try {
      const {value: isBodyOverflowHidden} = await executor.executeScript(EyesWDIOUtils.JS_GET_IS_BODY_OVERFLOW_HIDDEN);
      return isBodyOverflowHidden;
    } catch (e) {
      throw new EyesDriverOperationError('Failed to get state of body overflow', e);
    }
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   * Updates the document's body "overflow" value
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @param {String} overflowValue The values of the overflow to set.
   * @return {Promise.<String>} A promise which resolves to the original overflow of the document.
   */
  static async setBodyOverflow(executor, overflowValue) {
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

    try {
      const {value: result} = await executor.executeScript(script);
      return result;
    } catch (e) {
      throw new EyesDriverOperationError('Failed to set body overflow', e);
    }
  }


  /**
   * Hides the scrollbars of the current context's document element.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @param {int} stabilizationTimeout The amount of time to wait for the "hide scrollbars" action to take effect (Milliseconds). Zero/negative values are ignored.
   * @return {Promise.<String>} The previous value of the overflow property (could be {@code null}).
   */
  static async hideScrollbars(executor, stabilizationTimeout) {
    const result = await EyesWDIOUtils.setOverflow(executor, 'hidden');
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
    const {value} = await executor.executeScript(EyesWDIOUtils.JS_GET_VIEWPORT_SIZE);
    // await browser.getViewportSize()
    return new RectangleSize(parseInt(value[0], 10) || 0, parseInt(value[1], 10) || 0);
  }

  /**
   * @param {Logger} logger
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {Promise.<RectangleSize>} The viewport size of the current context, or the display size if the viewport size cannot be retrieved.
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
      await EyesWDIOUtils._setBrowserSizeLoop(logger, browser, requiredSize);
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
  static async _setBrowserSizeLoop(logger, browser, requiredSize, sleep = 1000, retries = 3) {
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

      return await EyesWDIOUtils._setBrowserSizeLoop(logger, browser, requiredSize, sleep, retries - 1);
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
    ArgumentGuard.notNull(requiredSize, "requiredSize");

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

      await EyesWDIOUtils._setViewportSizeLoop(logger, browser, requiredSize, actualViewportSize, browserSize,
        widthDiff, widthStep, heightDiff, heightStep, currWidthChange, currHeightChange,
        retriesLeft, lastRequiredBrowserSize);
      return browser.eyes.getPromiseFactory().resolve();
    } else {
      throw new Error("Failed to set viewport size!");
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
  static async _setViewportSizeLoop(logger,
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
      return EyesWDIOUtils._setViewportSizeLoop(logger, browser, requiredSize, actualViewportSize, browserSize,
        widthDiff, widthStep, heightDiff, heightStep, currWidthChange, currHeightChange,
        retriesLeft, lastRequiredBrowserSize);
    }

    throw new Error("EyesError: failed to set window size! Zoom workaround failed.");
  }


}

module.exports = EyesWDIOUtils;
