"use strict";

const {EyesJsBrowserUtils, Location, RectangleSize, ArgumentGuard, GeneralUtils} = require('@applitools/eyes-sdk-core');

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
    return 0;
  }
}();

// noinspection JSUnusedLocalSymbols
let javascriptHandler = new class JavascriptHandlerImpl extends JavascriptHandler {}();


class EyesWDIOUtils {

  /**
   * @param {ImageOrientationHandler} value
   */
  static setImageOrientationHandlerHandler(value) {
    imageOrientationHandler = value;
  }

  /**
   * @param {WebDriver} driver The driver for which to check the orientation.
   * @return {Promise<boolean>} {@code true} if this is a mobile device and is in landscape orientation. {@code
   *   false} otherwise.
   */
  static isLandscapeOrientation(driver) {
    return imageOrientationHandler.isLandscapeOrientation(driver);
  }

  /**
   * @param {Logger} logger
   * @param {WebDriver} driver
   * @param {MutableImage} image
   * @return {Promise<number>}
   */
  static tryAutomaticRotation(logger, driver, image) {
    return imageOrientationHandler.tryAutomaticRotation(logger, driver, image);
  }

  /**
   * @param {JavascriptHandler} handler
   */
  static setJavascriptHandler(handler) {
    javascriptHandler = handler;
  }

  /**
   * @param {string} script
   * @param {object...} args
   */
  static handleSpecialCommands(script, ...args) {
    return javascriptHandler.handle(script, ...args);
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


// IMPORTANT: Notice there's a major difference between scrollWidth and scrollHeight.
// While scrollWidth is the maximum between an element's width and its content width,
// scrollHeight might be smaller (!) than the clientHeight, which is why we take the maximum between them.
  static get JS_COMPUTE_CONTENT_ENTIRE_SIZE() {
    return "var scrollWidth = document.documentElement.scrollWidth; " +
      "var bodyScrollWidth = document.body.scrollWidth; " +
      "var totalWidth = Math.max(scrollWidth, bodyScrollWidth); " +
      "var clientHeight = document.documentElement.clientHeight; " +
      "var bodyClientHeight = document.body.clientHeight; " +
      "var scrollHeight = document.documentElement.scrollHeight; " +
      "var bodyScrollHeight = document.body.scrollHeight; " +
      "var maxDocElementHeight = Math.max(clientHeight, scrollHeight); " +
      "var maxBodyHeight = Math.max(bodyClientHeight, bodyScrollHeight); " +
      "var totalHeight = Math.max(maxDocElementHeight, maxBodyHeight); ";
  }

  // noinspection JSUnusedGlobalSymbols
  static get JS_RETURN_CONTENT_ENTIRE_SIZE() {
    return EyesWDIOUtils.JS_COMPUTE_CONTENT_ENTIRE_SIZE + "return [totalWidth, totalHeight];";
  }

  static get JS_SCROLL_TO_BOTTOM_RIGHT() {
    return EyesWDIOUtils.JS_COMPUTE_CONTENT_ENTIRE_SIZE + "window.scrollTo(totalWidth, totalHeight);";
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
    return await executor.executeScript(script);
  }

  static JS_GET_TRANSFORM_VALUE(element, key) {
    return `${element}.style['${key}']`;
  }

  static JS_SET_TRANSFORM_VALUE(element, key, value) {
    return `${element}.style['${key}'] = '${value}'`;
  }


  static getCurrentElementTransforms(executor, element) {
    let script = "return { ";
    for (let i = 0, l = EyesWDIOUtils.JS_TRANSFORM_KEYS.length; i < l; i++) {
      const tk = EyesWDIOUtils.JS_TRANSFORM_KEYS[i];
      script += `'${tk}': ${EyesWDIOUtils.JS_GET_TRANSFORM_VALUE('arguments[0]', tk)},`;
    }
    script += " }";
    return executor.executeScript(script, element);
  }


  /**
   * @param {WDIOJSExecutor} executor
   * @param {Promise.<WebElement>} webElementPromise
   * @param transform
   * @return {*|Promise}
   */
  static async setElementTransforms(executor, webElementPromise, transform) {
    let script = '';
    for (let i = 0, l = EyesWDIOUtils.JS_TRANSFORM_KEYS.length; i < l; i++) {
      const tk = EyesWDIOUtils.JS_TRANSFORM_KEYS[i];
      script += `${EyesWDIOUtils.JS_SET_TRANSFORM_VALUE('arguments[0]', tk, transform)};`;
      // script += `${EyesWDIOUtils.JS_SET_TRANSFORM_VALUE("document.getElementsByTagName('img')[0]", tk, transform)};`;
    }

    const webElement = await webElementPromise;
    return executor.executeScript(script, webElement.element);
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
   *
   * @param {WDIOJSExecutor} executor
   * @param {Promise.<WebElement>} webElementPromise
   * @param {Location} position
   * @return {*}
   */
  static elementTranslateTo(executor, webElementPromise, position) {
    return EyesWDIOUtils.setElementTransforms(executor, webElementPromise, `translate(${position.getX()}px, ${position.getY()}px)`);
  }


  /**
   * Gets the current scroll position.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {Promise.<Location>} The current scroll position of the current frame.
   */
  static async getCurrentScrollPosition(executor) {
    const value = await executor.executeScript(EyesWDIOUtils.JS_GET_CURRENT_SCROLL_POSITION);
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
      const value = await executor.executeScript(EyesWDIOUtils.JS_GET_CONTENT_ENTIRE_SIZE);
      return new RectangleSize(parseInt(value[0], 10) || 0, parseInt(value[1], 10) || 0);
    } catch (e) {
      throw new EyesDriverOperationError("Failed to extract entire size!", e);
    }
  }


  /**
   * Sets the overflow of the current context's document element.
   *
   * @param {EyesJsExecutor} executor - The executor to use.
   * @param {?string} value - The overflow value to set.
   * @param {WebElement} [scrollbarsRoot]
   * @return {Promise<string>} - The previous value of overflow (could be {@code null} if undefined).
   */
  static setOverflow(executor, value, scrollbarsRoot) {
    return EyesJsBrowserUtils.setOverflow(executor, value, scrollbarsRoot);
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {Promise.<Boolean>} A promise which resolves to the {@code true} if body overflow is hidden, {@code false} otherwise.
   */
  static isBodyOverflowHidden(executor) {
    try {
      return executor.executeScript(EyesWDIOUtils.JS_GET_IS_BODY_OVERFLOW_HIDDEN);
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

    try {
      return executor.executeScript(script);
    } catch (e) {
      throw new EyesDriverOperationError('Failed to set body overflow', e);
    }
  }


  /**
   * Hides the scrollbars of the current context's document element.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @param {int} stabilizationTimeout The amount of time to wait for the "hide scrollbars" action to take effect (Milliseconds). Zero/negative values are ignored.
   * @param {WebElement} scrollbarsRoot
   * @return {Promise.<String>} The previous value of the overflow property (could be {@code null}).
   */
  static async hideScrollbars(executor, stabilizationTimeout, scrollbarsRoot) {
    const res = await EyesJsBrowserUtils.setOverflow(executor, 'hidden', scrollbarsRoot);
    if (stabilizationTimeout > 0) {
      await executor.sleep(stabilizationTimeout);
      return res;
    } else {
      return res;
    }
  }


  /**
   * Tries to get the viewport size using Javascript. If fails, gets the entire browser window size!
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {RectangleSize} The viewport size.
   */
  static async getViewportSize(executor) {
    const value = await executor.executeScript(EyesWDIOUtils.JS_GET_VIEWPORT_SIZE);
    // await browser.getViewportSize()
    return new RectangleSize(parseInt(value[0], 10) || 0, parseInt(value[1], 10) || 0);
  }

  /**
   * @param {Logger} logger
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {Promise.<RectangleSize>} The viewport size of the current context, or the display size if the viewport size cannot be retrieved.
   */
  static async getViewportSizeOrDisplaySize(logger, executor) {
    logger.verbose("getViewportSizeOrDisplaySize()");

    try {
      return EyesWDIOUtils.getViewportSize(executor);
    } catch (e) {
      logger.verbose("Failed to extract viewport size using Javascript:", e);

      // If we failed to extract the viewport size using JS, will use the window size instead.
      logger.verbose("Using window size as viewport size.");

      /** {width:number, height:number} */
      const size = await executor.remoteWebDriver.getWindowSize();
      let width = size.width;
      let height = size.height;
      try {
        const result = await EyesWDIOUtils.isLandscapeOrientation(executor);
        if (result && height > width) {
          const temp = width;
          // noinspection JSSuspiciousNameCombination
          width = height;
          height = temp;
        }
      } catch (ignored) {
        // todo
        console.log(ignored);
        // Not every WebDriver supports querying for orientation.
      }

      logger.verbose(`Done! Size ${width} x ${height}`);
      return new RectangleSize(width, height);
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
      return true;
    } catch (ignored) {
      return false;
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
    logger.verbose("Trying to set browser size to:", requiredSize);

    await browser.remoteWebDriver.setWindowSize(requiredSize.getWidth(), requiredSize.getHeight());
    const size = await browser.remoteWebDriver.getWindowSize();
    const currentSize = new RectangleSize(size.width, size.height);
    logger.log(`Current browser size: ${currentSize}`);
    if (currentSize.equals(requiredSize)) {
      return true;
    }

    if (retries === 0) {
      logger.verbose('Failed to set browser size: retries is out.');
      return false;
    }

    return EyesWDIOUtils._setBrowserSizeLoop(logger, browser, requiredSize, sleep, retries - 1);
  }

  /**
   * @param {Logger} logger
   * @param {EyesWebDriver} browser The browser to use.
   * @param {RectangleSize} actualViewportSize
   * @param {RectangleSize} requiredViewportSize
   * @return {Promise<boolean>}
   */
  static async setBrowserSizeByViewportSize(logger, browser, actualViewportSize, requiredViewportSize) {
    /** {width:number, height:number} */
    const browserSize = await browser.remoteWebDriver.getWindowSize();
    logger.verbose("Current browser size:", browserSize);
    const requiredBrowserSize = {
      width: browserSize.width + (requiredViewportSize.getWidth() - actualViewportSize.getWidth()),
      height: browserSize.height + (requiredViewportSize.getHeight() - actualViewportSize.getHeight())
    };
    return EyesWDIOUtils.setBrowserSize(logger, browser, new RectangleSize(requiredBrowserSize));
  }

  /**
   * Tries to set the viewport
   *
   * @param {Logger} logger
   * @param {EyesWebDriver} browser The browser to use.
   * @param {RectangleSize} requiredSize The viewport size.
   * @returns {Promise<boolean>}
   */
  static async setViewportSize(logger, browser, requiredSize) {
    ArgumentGuard.notNull(requiredSize, "requiredSize");

    // First we will set the window size to the required size.
    // Then we'll check the viewport size and increase the window size accordingly.
    logger.verbose("setViewportSize(", requiredSize, ")");

    let jsExecutor = browser.eyes.jsExecutor;
    /** RectangleSize */
    let actualViewportSize = await EyesWDIOUtils.getViewportSize(jsExecutor);
    logger.verbose("Initial viewport size:", actualViewportSize);

    // If the viewport size is already the required size
    if (actualViewportSize.equals(requiredSize)) {
      return true;
    }

    // We move the window to (0,0) to have the best chance to be able to
    // set the viewport size as requested.
    try {
      await browser.remoteWebDriver.setWindowPosition(0, 0);
    } catch (ignored) {
      logger.verbose("Warning: Failed to move the browser window to (0,0)");
    }

    await EyesWDIOUtils.setBrowserSizeByViewportSize(logger, browser, actualViewportSize, requiredSize);
    actualViewportSize = await EyesWDIOUtils.getViewportSize(jsExecutor);

    if (actualViewportSize.equals(requiredSize)) {
      return true;
    }

    // Additional attempt. This Solves the "maximized browser" bug
    // (border size for maximized browser sometimes different than non-maximized, so the original browser size calculation is wrong).
    logger.verbose("Trying workaround for maximization...");

    await EyesWDIOUtils.setBrowserSizeByViewportSize(logger, browser, actualViewportSize, requiredSize);
    actualViewportSize = await EyesWDIOUtils.getViewportSize(jsExecutor);

    logger.verbose("Current viewport size:", actualViewportSize);

    if (actualViewportSize.equals(requiredSize)) {
      return true;
    }

    const MAX_DIFF = 3;
    const widthDiff = actualViewportSize.getWidth() - requiredSize.getWidth();
    const widthStep = widthDiff > 0 ? -1 : 1; // -1 for smaller size, 1 for larger
    const heightDiff = actualViewportSize.getHeight() - requiredSize.getHeight();
    const heightStep = heightDiff > 0 ? -1 : 1;

    const browserSize = await browser.remoteWebDriver.getWindowSize();
    const currWidthChange = 0;
    const currHeightChange = 0;
    // We try the zoom workaround only if size difference is reasonable.

    if (Math.abs(widthDiff) <= MAX_DIFF && Math.abs(heightDiff) <= MAX_DIFF) {
      logger.verbose("Trying workaround for zoom...");
      const retriesLeft = Math.abs((widthDiff === 0 ? 1 : widthDiff) * (heightDiff === 0 ? 1 : heightDiff)) * 2;
      const lastRequiredBrowserSize = null;

      return EyesWDIOUtils._setViewportSizeLoop(logger, browser, requiredSize, actualViewportSize, browserSize,
        widthDiff, widthStep, heightDiff, heightStep, currWidthChange, currHeightChange,
        retriesLeft, lastRequiredBrowserSize);
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
   * @return {Promise<boolean>}
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
      return true;
    }

    await EyesWDIOUtils.setBrowserSize(logger, browser, requiredBrowserSize);
    lastRequiredBrowserSize = requiredBrowserSize;
    actualViewportSize = EyesWDIOUtils.getViewportSize(browser.eyes.jsExecutor);

    logger.verbose("Current viewport size (loop):", actualViewportSize);
    if (actualViewportSize.equals(requiredSize)) {
      return true;
    }

    if ((Math.abs(currWidthChange) <= Math.abs(widthDiff) || Math.abs(currHeightChange) <= Math.abs(heightDiff)) && (--retriesLeft > 0)) {
      return EyesWDIOUtils._setViewportSizeLoop(logger, browser, requiredSize, actualViewportSize, browserSize,
        widthDiff, widthStep, heightDiff, heightStep, currWidthChange, currHeightChange,
        retriesLeft, lastRequiredBrowserSize);
    }

    throw new Error("EyesError: failed to set window size! Zoom workaround failed.");
  }


  /**
   * Scrolls current frame to its bottom right.
   *
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {Promise} A promise which resolves after the action is performed and timeout passed.
   */
  static scrollToBottomRight(executor) {
    return executor.executeScript(EyesWDIOUtils.JS_SCROLL_TO_BOTTOM_RIGHT);
  }

}

module.exports = EyesWDIOUtils;
