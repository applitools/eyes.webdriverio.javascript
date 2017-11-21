'use strict';

const webdriver = require('webdriverio');
const EyesUtils = require('eyes.utils');
const Frame = require('./Frame');
const FrameChain = require('./FrameChain');
const EyesWDIOUtils = require('./EyesWDIOUtils');
const EyesWebElement = require('./EyesWebElement');
const ScrollPositionProvider = require('./ScrollPositionProvider');
const EyesTargetLocator = require('./EyesTargetLocator');
const GeneralUtils = EyesUtils.GeneralUtils;

/*
 ---

 name: EyesWebDriver

 description: Wraps a Remote Web Driver.

 ---
 */

class EyesWebDriver {

  /**
   *
   * C'tor = initializes the module settings
   *
   * @constructor
   * @param {Object} remoteWebDriver
   * @param {Eyes} eyes An instance of Eyes
   * @param {Object} logger
   * @param {PromiseFactory} promiseFactory
   **/
  constructor(remoteWebDriver, eyes, logger, promiseFactory) {
    this._eyesDriver = eyes;
    this._logger = logger;
    this._promiseFactory = promiseFactory;
    this._defaultContentViewportSize = null;
    this._frameChain = new FrameChain(this._logger, null);
    this.setRemoteWebDriver(remoteWebDriver);
  }

  //noinspection JSUnusedGlobalSymbols
  getEyes() {
    return this._eyesDriver;
  }

  //noinspection JSUnusedGlobalSymbols
  setEyes(eyes) {
    this._eyesDriver = eyes;
  }

  //noinspection JSUnusedGlobalSymbols
  getRemoteWebDriver() {
    return this._driver;
  }

  //noinspection JSUnusedGlobalSymbols
  setRemoteWebDriver(remoteWebDriver) {
    this._driver = remoteWebDriver;
    GeneralUtils.mixin(this, remoteWebDriver);

    // remove then method, which comes from thenableWebDriver (Selenium 3+)
    delete this.then;
  }

  //noinspection JSUnusedGlobalSymbols
  getUserAgent() {
    return this._driver.executeScript('return navigator.userAgent');
  }


  /**
   * @param {String} locator
   * @return {EyesWebElement}
   */
  async findElement(locator) {
    let element = await this._driver.element(locator);
    return new EyesWebElement(element, this, this._logger);
  }


  /**
   * @param {String} locator
   * @return {Promise.<EyesWebElement[]>}
   */
  findElements(locator) {
    const that = this;
    return this._driver.findElements(locator).then(function (elements) {
      return elements.map(function (element) {
        return new EyesWebElement(element, that, that._logger);
      });
    });
  }

  //noinspection JSUnusedGlobalSymbols
  /**
   * @param {string} cssSelector
   * @return {EyesRemoteWebElement}
   */
  findElementByCssSelector(cssSelector) {
    return this.findElement(this._byFunctions.css(cssSelector));
  }

  //noinspection JSUnusedGlobalSymbols
  /**
   * @param {string} cssSelector
   * @return {Promise.<EyesRemoteWebElement[]>}
   */
  findElementsByCssSelector(cssSelector) {
    return this.findElements(this._byFunctions.css(cssSelector));
  }

  //noinspection JSUnusedGlobalSymbols
  /**
   * @param {string} name
   * @return {EyesRemoteWebElement}
   */
  findElementById(name) {
    return this.findElement(this._byFunctions.id(name));
  }

  //noinspection JSUnusedGlobalSymbols
  /**
   * @param {string} name
   * @return {Promise.<EyesRemoteWebElement[]>}
   */
  findElementsById(name) {
    return this.findElements(this._byFunctions.id(name));
  }

  //noinspection JSUnusedGlobalSymbols
  /**
   * @param {string} name
   * @return {EyesRemoteWebElement}
   */
  findElementByName(name) {
    return this.findElement(this._byFunctions.name(name));
  }

  //noinspection JSUnusedGlobalSymbols
  /**
   * @param {string} name
   * @return {Promise.<EyesRemoteWebElement[]>}
   */
  findElementsByName(name) {
    return this.findElements(this._byFunctions.name(name));
  }

//  EyesWebDriver.prototype.init = function () {
//    return new Promise(function (resolve) {
//      this._driver.getCapabilities().then(function (capabilities) {
//        if (!capabilities.has(webdriver.Capability.TAKES_SCREENSHOT)) {
//          this._screenshotTaker = new ScreenshotTaker();
//        }
//        resolve();
//      }.bind(this));
//    }.bind(this));
//  };

  /**
   * @returns {EyesTargetLocator}
   */
  switchTo() {
    const that = this;
    this._logger.verbose("switchTo()");

    const OnWillSwitch = function () {
    };

    /**
     * @param {EyesTargetLocator.TargetType} targetType
     * @param {EyesWebElement|WebElement} targetFrame
     * @returns {Promise<void>}
     */
    OnWillSwitch.willSwitchToFrame = function (targetType, targetFrame) {
      that._logger.verbose("willSwitchToFrame()");
      switch (targetType) {
        case EyesTargetLocator.TargetType.DEFAULT_CONTENT:
          that._logger.verbose("Default content.");
          that._frameChain.clear();
          return that._promiseFactory.makePromise(function (resolve) {
            resolve();
          });
        case EyesTargetLocator.TargetType.PARENT_FRAME:
          that._logger.verbose("Parent frame.");
          that._frameChain.pop();
          return that._promiseFactory.makePromise(function (resolve) {
            resolve();
          });
        default: // Switching into a frame
          that._logger.verbose("Frame");

          let frameId, pl, sp, size;
          return targetFrame.getId()
            .then(function (_id) {
              frameId = _id;
              return targetFrame.getLocation();
            })
            .then(function (_location) {
              pl = _location;
              return targetFrame.getSize();
            })
            .then(function (_size) {
              size = _size;
              return new ScrollPositionProvider(that._logger, that._driver, that._promiseFactory).getCurrentPosition();
            })
            .then(function (_scrollPosition) {
              sp = _scrollPosition;

              // Get the frame's content location.
              return EyesWDIOUtils.getLocationWithBordersAddition(that._logger, targetFrame, pl, that._promiseFactory);
            }).then(function (contentLocation) {
              that._frameChain.push(new Frame(that._logger, targetFrame, frameId, contentLocation, size, sp));
              that._logger.verbose("Done!");
            });
      }
    };

    //noinspection JSUnusedLocalSymbols
    OnWillSwitch.willSwitchToWindow = function (nameOrHandle) {
      that._logger.verbose("willSwitchToWindow()");
      that._frameChain.clear();
      that._logger.verbose("Done!");
      return that._promiseFactory.makePromise(function (resolve) {
        resolve();
      });
    };

    return new EyesTargetLocator(this._logger, this, this._driver.switchTo(), OnWillSwitch, this._promiseFactory);
  }

  /**
   * @param {boolean} forceQuery If true, we will perform the query even if we have a cached viewport size.
   * @return {Promise<{width: number, height: number}>} The viewport size of the default content (outer most frame).
   */
  getDefaultContentViewportSize(forceQuery) {
    const that = this;
    return new Promise(function (resolve) {
      that._logger.verbose("getDefaultContentViewportSize()");

      if (that._defaultContentViewportSize !== null && !forceQuery) {
        that._logger.verbose("Using cached viewport size: ", that._defaultContentViewportSize);
        resolve(that._defaultContentViewportSize);
        return;
      }

      const currentFrames = that.getFrameChain();
      const promise = that._promiseFactory.makePromise(function (resolve) {
        resolve();
      });

      // Optimization
      if (currentFrames.size() > 0) {
        promise.then(function () {
          return that.switchTo().defaultContent();
        });
      }

      promise.then(function () {
        that._logger.verbose("Extracting viewport size...");
        return EyesWDIOUtils.getViewportSizeOrDisplaySize(that._logger, that._driver, that._promiseFactory);
      }).then(function (viewportSize) {
        that._defaultContentViewportSize = viewportSize;
        that._logger.verbose("Done! Viewport size: ", that._defaultContentViewportSize);
      });

      if (currentFrames.size() > 0) {
        promise.then(function () {
          return that.switchTo().frames(currentFrames);
        });
      }

      promise.then(function () {
        resolve(that._defaultContentViewportSize);
      });
    });
  }

  /**
   *
   * @return {FrameChain} A copy of the current frame chain.
   */
  getFrameChain() {
    return new FrameChain(this._logger, this._frameChain);
  }

}

module.exports = EyesWebDriver;
