'use strict';

const {
  ContextBasedScaleProviderFactory,
  CoordinatesType,
  EyesBase,
  FailureReports,
  FixedScaleProviderFactory,
  Location,
  NullCutProvider,
  NullScaleProvider,
  NullRegionProvider,
  ScaleProviderIdentityFactory,
  RectangleSize,
  Region,
  RegionProvider,
  TestFailedError,
  UserAgent,
  ArgumentGuard,
  SimplePropertyHandler
} = require('@applitools/eyes.sdk.core');

const ImageProviderFactory = require('./capture/ImageProviderFactory');
const CssTranslatePositionProvider = require('./positioning/CssTranslatePositionProvider');
const ScrollPositionProvider = require('./positioning/ScrollPositionProvider');
const RegionPositionCompensationFactory = require('./positioning/RegionPositionCompensationFactory');
const EyesWebDriver = require('./wrappers/EyesWebDriver');
const EyesWebElement = require('./wrappers/EyesWebElement');
const EyesWDIOScreenshot = require('./capture/EyesWDIOScreenshot');
const Frame = require('./frames/Frame');
const FrameChain = require('./frames/FrameChain');
const FullPageCaptureAlgorithm = require('./capture/FullPageCaptureAlgorithm');
const EyesWDIOScreenshotFactory = require('./capture/EyesWDIOScreenshotFactory');
const EyesWDIOUtils = require('./EyesWDIOUtils');
const ElementPositionProvider = require('./positioning/ElementPositionProvider');
const StitchMode = require('./StitchMode');
const Target = require('./fluent/Target');
const WDIOJSExecutor = require('./WDIOJSExecutor');
const WebDriver = require('./wrappers/WebDriver');

const VERSION = require('../package.json').version;


const DEFAULT_STITCHING_OVERLAP = 50; // px
const DEFAULT_WAIT_BEFORE_SCREENSHOTS = 100; // Milliseconds
const DEFAULT_WAIT_SCROLL_STABILIZATION = 200; // Milliseconds
const USE_DEFAULT_MATCH_TIMEOUT = -1;


class Eyes extends EyesBase {

  static get UNKNOWN_DEVICE_PIXEL_RATIO() {
    return 0;
  }

  static get DEFAULT_DEVICE_PIXEL_RATIO() {
    return 1;
  }


  /**
   * Creates a new (possibly disabled) Eyes instance that interacts with the Eyes Server at the specified url.
   *
   * @param {String} [serverUrl=EyesBase.DEFAULT_EYES_SERVER] The Eyes server URL.
   * @param {Boolean} [isDisabled=false] Set to true to disable Applitools Eyes and use the webdriver directly.
   * @param {PromiseFactory} [promiseFactory] If not specified will be created using `Promise` object
   **/
  constructor(serverUrl = EyesBase.getDefaultServerUrl(), isDisabled = false, promiseFactory) {
    super(serverUrl, isDisabled, promiseFactory);

    /** @type {EyesWebDriver} */
    this._driver = undefined;
    /** @type {boolean} */
    this._forceFullPageScreenshot = false;
    this._imageRotationDegrees = 0;
    this._automaticRotation = true;
    /** @type {boolean} */
    this._isLandscape = false;
    this._hideScrollbars = null;
    /** @type {boolean} */
    this._checkFrameOrElement = false;

    /** @type {String} */
    this._originalDefaultContentOverflow = false;
    /** @type {String} */
    this._originalFrameOverflow = false;

    /** @type {String} */
    this._originalOverflow = null;
    /** @type {EyesJsExecutor} */
    this._jsExecutor = undefined;
    this._rotation = undefined;
    /** @type {StitchMode} */
    this._stitchMode = StitchMode.SCROLL;
    /** @type {ImageProvider} */
    this._imageProvider = undefined;
    /** @type {RegionPositionCompensation} */
    this._regionPositionCompensation = undefined;
    /** @type {number} */
    this._devicePixelRatio = Eyes.UNKNOWN_DEVICE_PIXEL_RATIO;
    /** @type {Region} */
    this._regionToCheck = null;
    /** @type {EyesWebElement} */
    this._targetElement = null;
    /** @type {ElementPositionProvider} */
    this._elementPositionProvider = undefined;
    /** @type {int} */
    this._waitBeforeScreenshots = DEFAULT_WAIT_BEFORE_SCREENSHOTS;
    /** @type {int} */
    this._stitchingOverlap = DEFAULT_STITCHING_OVERLAP;
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   *
   * @param {Object} driver
   * @param {String} appName
   * @param {String} testName
   * @param {RectangleSize|{width: number, height: number}} viewportSize
   * @param {SessionType} [sessionType=null] The type of test (e.g.,  standard test / visual performance test).
   * @returns {Promise.<*>}
   */
  async open(driver, appName, testName, viewportSize = null, sessionType = null) {
    ArgumentGuard.notNull(driver, 'driver');

    this.getPromiseFactory().setFactoryMethod(asyncAction => {
      return new Promise(asyncAction);
    });

    this._logger.verbose('Running using Webdriverio module');

    if (this._isDisabled) {
      this._logger.verbose('Ignored');
      return this.getPromiseFactory().resolve(driver);
    }

    this._driver = new EyesWebDriver(new WebDriver(driver), this, this._logger);

    const userAgentString = await this._driver.getUserAgent();
    if (userAgentString) {
      this._userAgent = UserAgent.parseUserAgentString(userAgentString, true);
    }

    this._imageProvider = ImageProviderFactory.getImageProvider(this._userAgent, this, this._logger, this._driver);
    this._regionPositionCompensation = RegionPositionCompensationFactory.getRegionPositionCompensation(this._userAgent, this, this._logger);

    this._jsExecutor = new WDIOJSExecutor(this._driver);

    await this.openBase(appName, testName, viewportSize, sessionType);

    this._devicePixelRatio = Eyes.UNKNOWN_DEVICE_PIXEL_RATIO;

    this._initPositionProvider();

    this._driver.rotation = this._rotation;

    return this._driver;
  }


  /**
   * @private
   * @return {Promise<ScaleProviderFactory>}
   */
  async _getScaleProviderFactory() {
    const that = this;
    return this._positionProvider.getEntireSize().then(entireSize => {
      return new ContextBasedScaleProviderFactory(that._logger, entireSize, that._viewportSizeHandler.get(), that._devicePixelRatio, false, that._scaleProviderHandler);
    });
  }


  /**
   * Takes a snapshot of the application under test and matches it with the expected output.
   *
   * @param {String} tag An optional tag to be associated with the snapshot.
   * @param {int} matchTimeout The amount of time to retry matching (Milliseconds).
   * @return {Promise} A promise which is resolved when the validation is finished.
   */
  checkWindow(tag, matchTimeout = USE_DEFAULT_MATCH_TIMEOUT) {
    return this.check(tag, Target.window().timeout(matchTimeout));
  }


  /**
   * Matches the frame given as parameter, by switching into the frame and using stitching to get an image of the frame.
   *
   * @param {Integer|String|By|WebElement|EyesWebElement} element The element which is the frame to switch to. (as
   * would be used in a call to driver.switchTo().frame() ).
   * @param {int|null} matchTimeout The amount of time to retry matching (milliseconds).
   * @param {String} tag An optional tag to be associated with the match.
   * @return {Promise} A promise which is resolved when the validation is finished.
   */
  checkFrame(element, matchTimeout = USE_DEFAULT_MATCH_TIMEOUT, tag) {
    return this.check(tag, Target.frame(element).timeout(matchTimeout).fully());
  }


  /**
   * Visually validates a region in the screenshot.
   *
   * @param {By} by The WebDriver selector used for finding the region to validate.
   * @param {String} tag An optional tag to be associated with the screenshot.
   * @param {int} matchTimeout The amount of time to retry matching.
   * @return {Promise} A promise which is resolved when the validation is finished.
   */
  checkRegionBy(by, tag, matchTimeout = USE_DEFAULT_MATCH_TIMEOUT) {
    return this.check(tag, Target.region(by).timeout(matchTimeout).fully());
  }


  /**
   * Switches into the given frame, takes a snapshot of the application under test and matches a region specified by the given selector.
   *
   * @param {String} frameNameOrId The name or id of the frame to switch to. (as would be used in a call to driver.switchTo().frame()).
   * @param {By} selector A Selector specifying the region to check.
   * @param {int|null} matchTimeout The amount of time to retry matching. (Milliseconds)
   * @param {String} tag An optional tag to be associated with the snapshot.
   * @param {boolean} stitchContent If {@code true}, stitch the internal content of the region (i.e., perform {@link #checkElement(By, int, String)} on the region.
   * @return {Promise} A promise which is resolved when the validation is finished.
   */
  async checkRegionInFrame(frameNameOrId, selector, matchTimeout = USE_DEFAULT_MATCH_TIMEOUT, tag, stitchContent) {
    try {
      // await this._driver.switchTo().frame(frameNameOrId);

      return this.check(tag, Target.region(selector, frameNameOrId).timeout(matchTimeout).stitchContent(stitchContent));
    } finally {
      // this._stitchContent = false;
      // await this._driver.switchTo().parentFrame();
    }
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   *
   * @param {By} selector
   * @param matchTimeout
   * @param tag
   * @returns {Promise.<*>}
   */
  checkElementBySelector(selector, matchTimeout, tag) {
    return this.check(tag, Target.region(selector).timeout(matchTimeout));
  }

  /**
   *
   * @param tag
   * @param {WebdriverioCheckSettings} checkSettings
   * @returns {Promise.<*>}
   */
  check(tag, checkSettings) {
    ArgumentGuard.notNull(checkSettings, 'checkSettings');

    const that = this;
    let result;

    return that.getPromiseFactory().resolve().then(() => {
      this._logger.verbose(`check("${tag}", checkSettings) - begin`);
      this._stitchContent = checkSettings.getStitchContent();
      const targetRegion = checkSettings.getTargetRegion();


      let switchedToFrameCount;
      return this._switchToFrame(checkSettings).then(switchedToFrameCount_ => {
        switchedToFrameCount = switchedToFrameCount_;
        that._regionToCheck = null;

        if (targetRegion) {
          return super.checkWindowBase(new RegionProvider(targetRegion, this.getPromiseFactory()), tag, false, checkSettings);
        } else if (checkSettings) {
          const targetSelector = checkSettings.targetSelector;
          let targetElement = checkSettings.targetElement;
          if (!targetElement && targetSelector) {
            targetElement = that._driver.findElement(targetSelector);
          }

          if (targetElement) {
            if (!targetElement.then && !targetElement instanceof Promise) {
              targetElement = Promise.resolve(targetElement);
            }
            return targetElement.then(targetElement_ => {
              that._targetElement = targetElement_ instanceof EyesWebElement ? targetElement_ : new EyesWebElement(that._logger, that._driver, targetElement_);

              if (this._stitchContent) {
                return that._checkElement(tag, checkSettings);
              } else {
                return that._checkRegion(tag, checkSettings);
              }
            });
          } else if (checkSettings.getFrameChain().length > 0) {
            if (this._stitchContent) {
              return that._checkFullFrameOrElement(tag, checkSettings);
            } else {
              return that._checkFrameFluent(tag, checkSettings);
            }
          } else {
            return super.checkWindowBase(new NullRegionProvider(that.getPromiseFactory()), tag, false, checkSettings);
          }
        }
      }).then((result_) => {
        result = result_;
        that._targetElement = null;
        return that._switchToParentFrame(switchedToFrameCount);
      }).then(() => {
        that._stitchContent = false;
        that._logger.verbose("check - done!");

        return result;
      });
    });
  }


  /**
   * @private
   * @return {Promise}
   */
  _checkRegion(name, checkSettings) {
    const that = this;

    const RegionProviderImpl = class RegionProviderImpl extends RegionProvider {
      // noinspection JSUnusedGlobalSymbols
      /** @override */
      getRegion () {
        return that._targetElement.getLocation().then(p => {
          return that._targetElement.getSize().then(d => {
            return new Region(Math.ceil(p.x), Math.ceil(p.y), d.width, d.height, CoordinatesType.CONTEXT_RELATIVE);
          });
        });
      }
    };

    return super.checkWindowBase(new RegionProviderImpl(), name, false, checkSettings).then(result => {
      that._logger.verbose("Done! trying to scroll back to original position..");

      return result;
    });
  }


  /**
   * @private
   * @return {Promise}
   */
  _checkElement(name, checkSettings) {
    const eyesElement = this._targetElement;
    const originalPositionProvider = this._positionProvider;
    const scrollPositionProvider = new ScrollPositionProvider(this._logger, this._jsExecutor);

    let result;
    const that = this;
    let originalScrollPosition, originalOverflow, error;
    return scrollPositionProvider.getCurrentPosition().then(originalScrollPosition_ => {
      originalScrollPosition = originalScrollPosition_;
      return eyesElement.getLocation();
    }).then(pl => {
      that._checkFrameOrElement = true;

      let elementLocation, elementSize;
      return eyesElement.getComputedStyle("display").then(displayStyle => {
        if (displayStyle !== "inline") {
          that._elementPositionProvider = new ElementPositionProvider(that._logger, that._driver, eyesElement);
        }
      }).then(() => {
        if (that._hideScrollbars) {
          return eyesElement.getOverflow().then(originalOverflow_ => {
            originalOverflow = originalOverflow_;
            // Set overflow to "hidden".
            return eyesElement.setOverflow("hidden");
          });
        }
      }).then(() => {
        return eyesElement.getClientWidth().then(elementWidth => {
          return eyesElement.getClientHeight().then(elementHeight => {
            elementSize = new RectangleSize(elementWidth, elementHeight);
          });
        });
      }).then(() => {
        return eyesElement.getComputedStyleInteger("border-left-width").then(borderLeftWidth => {
          return eyesElement.getComputedStyleInteger("border-top-width").then(borderTopWidth => {
            elementLocation = new Location(pl.getX() + borderLeftWidth, pl.getY() + borderTopWidth);
          });
        });
      }).then(() => {
        const elementRegion = new Region(elementLocation, elementSize, CoordinatesType.CONTEXT_RELATIVE);

        that._logger.verbose("Element region: " + elementRegion);

        that._logger.verbose("replacing regionToCheck");
        that._regionToCheck = elementRegion;

        return super.checkWindowBase(new NullRegionProvider(this.getPromiseFactory()), name, false, checkSettings);
      });
    }).then(result_ => {
      result = result_;
      return result;
    }).catch(error_ => {
      error = error_;
    }).then(() => {
      if (originalOverflow) {
        return eyesElement.setOverflow(originalOverflow);
      }
    }).then(() => {
      that._checkFrameOrElement = false;
      that._positionProvider = originalPositionProvider;
      that._regionToCheck = null;
      that._elementPositionProvider = null;

      return scrollPositionProvider.setPosition(originalScrollPosition);
    }).then(() => {
      if (error) {
        throw error;
      } else {
        return result;
      }
    });
  }


  /**
   * Updates the state of scaling related parameters.
   *
   * @protected
   * @return {Promise.<ScaleProviderFactory>}
   */
  _updateScalingParams() {
    // Update the scaling params only if we haven't done so yet, and the user hasn't set anything else manually.
    if (this._devicePixelRatio === Eyes.UNKNOWN_DEVICE_PIXEL_RATIO && this._scaleProviderHandler.get() instanceof NullScaleProvider) {
      this._logger.verbose("Trying to extract device pixel ratio...");

      const that = this;
      return EyesWDIOUtils.getDevicePixelRatio(that._jsExecutor).then(ratio => {
        that._devicePixelRatio = ratio;
      }).catch(err => {
        that._logger.verbose("Failed to extract device pixel ratio! Using default.", err);
        that._devicePixelRatio = Eyes.DEFAULT_DEVICE_PIXEL_RATIO;
      }).then(() => {
        that._logger.verbose(`Device pixel ratio: ${that._devicePixelRatio}`);
        that._logger.verbose("Setting scale provider...");
        return that._getScaleProviderFactory();
      }).catch(err => {
        that._logger.verbose("Failed to set ContextBasedScaleProvider.", err);
        that._logger.verbose("Using FixedScaleProvider instead...");
        return new FixedScaleProviderFactory(1 / that._devicePixelRatio, that._scaleProviderHandler);
      }).then(factory => {
        that._logger.verbose("Done!");
        return factory;
      });
    }

    // If we already have a scale provider set, we'll just use it, and pass a mock as provider handler.
    const nullProvider = new SimplePropertyHandler();
    return this.getPromiseFactory().resolve(new ScaleProviderIdentityFactory(this._scaleProviderHandler.get(), nullProvider));
  }


  /**
   * @private
   * @return {Promise}
   */
  _checkFullFrameOrElement(name, checkSettings) {
    this._checkFrameOrElement = true;

    const that = this;
    this._logger.verbose("checkFullFrameOrElement()");

    const RegionProviderImpl = class RegionProviderImpl extends RegionProvider {
      // noinspection JSUnusedGlobalSymbols
      /** @override */
      getRegion () {
        if (that._checkFrameOrElement) {
          // noinspection JSUnresolvedFunction
          return that._ensureFrameVisible().then(fc => {
            // FIXME - Scaling should be handled in a single place instead
            // noinspection JSUnresolvedFunction
            return that._updateScalingParams().then(scaleProviderFactory => {
              let screenshotImage;
              return that._imageProvider.getImage().then(screenshotImage_ => {
                screenshotImage = screenshotImage_;
                return that._debugScreenshotsProvider.save(screenshotImage_, "checkFullFrameOrElement");
              }).then(() => {
                const scaleProvider = scaleProviderFactory.getScaleProvider(screenshotImage.getWidth());
                // TODO: do we need to scale the image? We don't do it in Java
                return screenshotImage.scale(scaleProvider.getScaleRatio());
              }).then(screenshotImage_ => {
                screenshotImage = screenshotImage_;
                const switchTo = that._driver.switchTo();
                return switchTo.frames(fc);
              }).then(() => {
                const screenshot = new EyesWDIOScreenshot(that._logger, that._driver, screenshotImage, that.getPromiseFactory());
                return screenshot.init();
              }).then(screenshot => {
                that._logger.verbose("replacing regionToCheck");
                that.setRegionToCheck(screenshot.getFrameWindow());
              });
            });
          });
        }

        return that.getPromiseFactory().resolve(Region.EMPTY);
      }
    };

    return super.checkWindowBase(new RegionProviderImpl(), name, false, checkSettings).then((result) => {
      that._checkFrameOrElement = false;

      return result;
    });
  }


  /**
   * @private
   * @return {Promise}
   */
  async _checkFrameFluent(name, checkSettings) {
    try {
      const frameChain = new FrameChain(this._logger, this._driver.getFrameChain());
      const targetFrame = frameChain.pop();
      this._targetElement = targetFrame.getReference();

      await this._driver.switchTo().framesDoScroll(frameChain);
      return await this._checkRegion(name, checkSettings);
    } finally {
      this._targetElement = null;
    }
  }


  /**
   * @private
   * @return {Promise.<int>}
   */
  async _switchToParentFrame(switchedToFrameCount) {
    if (switchedToFrameCount > 0) {
      await this._driver.switchTo().parentFrame();
      switchedToFrameCount--;
      return await this._switchToParentFrame(switchedToFrameCount);
    }

    return this.getPromiseFactory().resolve();
  }

  /**
   * @private
   * @return {Promise.<int>}
   */
  async _switchToFrame(checkSettings) {
    if (!checkSettings) {
      return this.getPromiseFactory().resolve(0);
    }

    const frameChain = checkSettings.getFrameChain();
    let switchedToFrameCount = 0;
    for (const frameLocator of frameChain) {
      const isSuccess = await this._switchToFrameLocator(frameLocator);
      if (isSuccess) {
        switchedToFrameCount++;
      }
    }
    return switchedToFrameCount;
  }


  /**
   * @private
   * @return {Promise.<boolean>}
   */
  async _switchToFrameLocator(frameLocator) {
    const switchTo = this._driver.switchTo();

    if (frameLocator.getFrameIndex()) { // todo
      await switchTo.frame(frameLocator.getFrameIndex());
      return true;
    }

    if (frameLocator.getFrameNameOrId()) {
      await switchTo.frame(frameLocator.getFrameNameOrId());
      return true;
    }

    if (frameLocator.getFrameSelector()) {
      const frameElement = await this._driver.findElement(frameLocator.getFrameSelector());
      if (frameElement) {
        await switchTo.frame(frameElement);
        return true;
      }
    }

    return false;
  }


  /**
   * Adds a mouse trigger.
   *
   * @param {MouseTrigger.MouseAction} action  Mouse action.
   * @param {Region} control The control on which the trigger is activated (context relative coordinates).
   * @param {Location} cursor  The cursor's position relative to the control.
   */
  addMouseTrigger(action, control, cursor) {
    if (this.getIsDisabled()) {
      this._logger.verbose(`Ignoring ${action} (disabled)`);
      return;
    }

    // Triggers are actually performed on the previous window.
    if (!this._lastScreenshot) {
      this._logger.verbose(`Ignoring ${action} (no screenshot)`);
      return;
    }

    if (!FrameChain.isSameFrameChain(this._driver.getFrameChain(), this._lastScreenshot.getFrameChain())) {
      this._logger.verbose(`Ignoring ${action} (different frame)`);
      return;
    }

    super.addMouseTriggerBase(action, control, cursor);
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Adds a mouse trigger.
   *
   * @param {MouseTrigger.MouseAction} action  Mouse action.
   * @param {WebElement} element The WebElement on which the click was called.
   * @return {Promise}
   */
  addMouseTriggerForElement(action, element) {
    if (this.getIsDisabled()) {
      this._logger.verbose(`Ignoring ${action} (disabled)`);
      return this.getPromiseFactory().resolve();
    }

    // Triggers are actually performed on the previous window.
    if (!this._lastScreenshot) {
      this._logger.verbose(`Ignoring ${action} (no screenshot)`);
      return this.getPromiseFactory().resolve();
    }

    if (!FrameChain.isSameFrameChain(this._driver.getFrameChain(), this._lastScreenshot.getFrameChain())) {
      this._logger.verbose(`Ignoring ${action} (different frame)`);
      return this.getPromiseFactory().resolve();
    }

    ArgumentGuard.notNull(element, "element");

    let p1;
    return element.getLocation().then(loc => {
      p1 = loc;
      return element.getSize();
    }).then(ds => {
      const elementRegion = new Region(p1.x, p1.y, ds.width, ds.height);
      super.addMouseTriggerBase(action, elementRegion, elementRegion.getMiddleOffset());
    });
  }

  /**
   * Adds a keyboard trigger.
   *
   * @param {Region} control The control on which the trigger is activated (context relative coordinates).
   * @param {String} text  The trigger's text.
   */
  addTextTrigger(control, text) {
    if (this.getIsDisabled()) {
      this._logger.verbose(`Ignoring ${text} (disabled)`);
      return;
    }

    // Triggers are actually performed on the previous window.
    if (!this._lastScreenshot) {
      this._logger.verbose(`Ignoring ${text} (no screenshot)`);
      return;
    }

    if (!FrameChain.isSameFrameChain(this._driver.getFrameChain(), this._lastScreenshot.getFrameChain())) {
      this._logger.verbose(`Ignoring ${text} (different frame)`);
      return;
    }

    super.addTextTriggerBase(control, text);
  }

  /**
   * Adds a keyboard trigger.
   *
   * @param {EyesWebElement} element The element for which we sent keys.
   * @param {String} text  The trigger's text.
   * @return {Promise}
   */
  addTextTriggerForElement(element, text) {
    if (this.getIsDisabled()) {
      this._logger.verbose(`Ignoring ${text} (disabled)`);
      return this.getPromiseFactory().resolve();
    }

    // Triggers are actually performed on the previous window.
    if (!this._lastScreenshot) {
      this._logger.verbose(`Ignoring ${text} (no screenshot)`);
      return this.getPromiseFactory().resolve();
    }

    if (!FrameChain.isSameFrameChain(this._driver.getFrameChain(), this._lastScreenshot.getFrameChain())) {
      this._logger.verbose(`Ignoring ${text} (different frame)`);
      return this.getPromiseFactory().resolve();
    }

    ArgumentGuard.notNull(element, "element");

    return element.getLocation().then(p1 => {
      return element.getSize().then(ds => {
        const elementRegion = new Region(Math.ceil(p1.x), Math.ceil(p1.y), ds.width, ds.height);
        super.addTextTrigger(elementRegion, text);
      });
    });
  }


  /**
   * Use this method only if you made a previous call to {@link #open(WebDriver, String, String)} or one of its variants.
   *
   * @override
   * @inheritDoc
   */
  getViewportSize() {
    let viewportSize = this._viewportSizeHandler.get();
    if (viewportSize) {
      return this.getPromiseFactory().resolve(viewportSize);
    }

    return this._driver.getDefaultContentViewportSize();
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Use this method only if you made a previous call to {@link #open(WebDriver, String, String)} or one of its variants.
   *
   * @protected
   * @override
   */
  setViewportSize(viewportSize) {
    if (this._viewportSizeHandler instanceof ReadOnlyPropertyHandler) {
      this._logger.verbose("Ignored (viewport size given explicitly)");
      return;
    }

    ArgumentGuard.notNull(viewportSize, "viewportSize");

    const that = this;
    const originalFrame = this._driver.getFrameChain();
    return this._driver.switchTo().defaultContent().then(() => {
      return EyesWDIOUtils.setViewportSize(that._logger, that._driver, new RectangleSize(viewportSize)).catch(err => {
        // Just in case the user catches that error
        return that._driver.switchTo().frames(originalFrame).then(() => {
          throw new TestFailedError("Failed to set the viewport size", err);
        });
      });
    }).then(() => {
      return that._driver.switchTo().frames(originalFrame);
    }).then(() => {
      that._viewportSizeHandler.set(new RectangleSize(viewportSize));
    });
  }


  /**
   * @param {EyesJsExecutor} executor The executor to use.
   * @return {Promise.<RectangleSize>} The viewport size of the current context, or the display size if the viewport size cannot be retrieved.
   */
  static getViewportSize(executor) {
    return EyesWDIOUtils.getViewportSizeOrDisplaySize(this._logger, executor);
  }


  /**
   * Set the viewport size using the driver. Call this method if for some reason you don't want to call {@link #open(WebDriver, String, String)} (or one of its variants) yet.
   *
   * @param {EyesWebDriver} driver The driver to use for setting the viewport.
   * @param {RectangleSize} viewportSize The required viewport size.
   * @return {Promise}
   */
  static setViewportSize(driver, viewportSize) {
    ArgumentGuard.notNull(driver, "driver");
    ArgumentGuard.notNull(viewportSize, "viewportSize");

    return EyesWDIOUtils.setViewportSize(this._logger, driver, new RectangleSize(viewportSize));
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   *
   * @param {By} locator
   * @returns {Region}
   */
  async getRegionByLocator(locator) {
    const element = await this._driver.findElement(locator);

    let elementSize = await element.getSize();
    let point = await element.getLocation();

    return new Region(point.x, point.y, elementSize.width, elementSize.height);
  };


  // noinspection JSUnusedGlobalSymbols
  /**
   *
   * @param {StitchMode} mode
   */
  set stitchMode(mode) {
    this._logger.verbose(`setting stitch mode to ${mode}`);
    this._stitchMode = mode;
    if (this._driver) {
      this._initPositionProvider();
    }
  };


  /** @private */
  _initPositionProvider() {
    // Setting the correct position provider.
    const stitchMode = this.stitchMode;
    this._logger.verbose(`initializing position provider. stitchMode: ${stitchMode}`);
    switch (stitchMode) {
      case StitchMode.CSS:
        this.setPositionProvider(new CssTranslatePositionProvider(this._logger, this._jsExecutor));
        break;
      default:
        this.setPositionProvider(new ScrollPositionProvider(this._logger, this._jsExecutor));
    }
  }


  /**
   * Get the stitch mode.
   * @return {StitchMode} The currently set StitchMode.
   */
  get stitchMode() {
    return this._stitchMode;
  };


  /**
   * Get jsExecutor
   * @return {EyesJsExecutor}
   */
  get jsExecutor() {
    return this._jsExecutor;
  }


  /** @override */
  beforeOpen() {
    return this._tryHideScrollbars();
  }

  /** @override */
  beforeMatchWindow() {
    return this._tryHideScrollbars();
  }

  /**
   * @private
   * @return {Promise}
   */
  async _tryHideScrollbars() {
    if (this._hideScrollbars) {
      try {
        const originalFC = new FrameChain(this._logger, this._driver.getFrameChain());
        const fc = new FrameChain(this._logger, this._driver.getFrameChain());
        this._originalOverflow = await EyesWDIOUtils.hideScrollbars(this._jsExecutor, 200);
        await this._tryHideScrollbarsLoop(fc);

        await this._driver.switchTo().frames(originalFC);
      } catch (err) {
        this._logger.log("WARNING: Failed to hide scrollbars! Error: " + err);
      }
    }

    return this.getPromiseFactory().resolve();
  }

  /**
   * @private
   * @param {FrameChain} fc
   * @return {Promise}
   */
  async _tryHideScrollbarsLoop(fc) {
    if (fc.size() > 0) {
      await this._driver.getRemoteWebDriver().switchTo().parentFrame();
      const frame = fc.pop();
      await EyesWDIOUtils.hideScrollbars(this._jsExecutor, 200);
      await this._tryHideScrollbarsLoop(fc);
    }

    return this.getPromiseFactory().resolve();
  }

  /**
   * @private
   * @return {Promise}
   */
  async _tryRestoreScrollbars() {
    if (this._hideScrollbars) {
      const originalFC = new FrameChain(this._logger, this._driver.getFrameChain());
      const fc = new FrameChain(this._logger, this._driver.getFrameChain());
      await this._tryRestoreScrollbarsLoop(fc);
      return this._driver.switchTo().frames(originalFC);
    }
  }

  /**
   * @private
   * @param {FrameChain} fc
   * @return {Promise}
   */
  async _tryRestoreScrollbarsLoop(fc) {
    if (fc.size() > 0) {
      await this._driver.remoteWebDriver.switchTo().parentFrame();
      const frame = fc.pop();
      await frame.getReference().setOverflow(frame.getOriginalOverflow());
      await this._tryRestoreScrollbarsLoop(fc);
    }

    return this.getPromiseFactory().resolve();
  }


  /**
   *
   * @returns {Promise.<EyesWDIOScreenshot>}
   * @override
   */
  async getScreenshot() {
    const scaleProviderFactory = await this.updateScalingParams();


    let originalBodyOverflow;

    let result;
    try {
      const screenshotFactory = new EyesWDIOScreenshotFactory(this._logger, this._driver, this.getPromiseFactory());

      const originalFrameChain = new FrameChain(this._logger, this._driver.getFrameChain());
      const algo = new FullPageCaptureAlgorithm(this._logger, this._userAgent, this._jsExecutor, this.getPromiseFactory());
      const switchTo = this._driver.switchTo();

      if (this._checkFrameOrElement) {
        this._logger.verbose("Check frame/element requested");

        await switchTo.framesDoScroll(originalFrameChain);

        const entireFrameOrElement = await algo.getStitchedRegion(
          this._imageProvider, this._regionToCheck, this._positionProvider,
          this.getElementPositionProvider(), scaleProviderFactory, this._cutProviderHandler.get(),
          this.getWaitBeforeScreenshots(), this._debugScreenshotsProvider, screenshotFactory,
          this.getStitchOverlap(), this._regionPositionCompensation
        );
        /*
                const {FileDebugScreenshotsProvider} = require('@applitools/eyes.sdk.core');
                const debugScreenshotsProvider = new FileDebugScreenshotsProvider();
                await debugScreenshotsProvider.save(entireFrameOrElement, "entireFrameOrElement");
        */

        this._logger.verbose("Building screenshot object...");
        let screenshot = new EyesWDIOScreenshot(this._logger, this._driver, entireFrameOrElement, this.getPromiseFactory());
        result = await screenshot.initFromFrameSize(new RectangleSize(entireFrameOrElement.getWidth(), entireFrameOrElement.getHeight()));
      } else if (this._forceFullPageScreenshot || this._stitchContent) {
        this._logger.verbose("Full page screenshot requested.");

        // Save the current frame path.
        const originalFramePosition = originalFrameChain.size() > 0 ? originalFrameChain.getDefaultContentScrollPosition() : Location.ZERO;

        await switchTo.defaultContent();

        const fullPageImage = await algo.getStitchedRegion(
          this._imageProvider, Region.EMPTY, new ScrollPositionProvider(this._logger, this._jsExecutor),
          this._positionProvider, scaleProviderFactory, this._cutProviderHandler.get(), this.getWaitBeforeScreenshots(),
          this._debugScreenshotsProvider, screenshotFactory, this.getStitchOverlap(), this._regionPositionCompensation);

        await switchTo.frames(originalFrameChain);
        const screenshot = new EyesWDIOScreenshot(this._logger, this._driver, fullPageImage, this.getPromiseFactory());
        result = await screenshot.init(null, originalFramePosition);
      } else {
        await this._ensureElementVisible(this._targetElement);

        this._logger.verbose("Screenshot requested...");
        let screenshotImage = await this._imageProvider.getImage();
        await this._debugScreenshotsProvider.save(screenshotImage, "original");

        const scaleProvider = scaleProviderFactory.getScaleProvider(screenshotImage.getWidth());
        if (scaleProvider.getScaleRatio() !== 1) {
          this._logger.verbose("scaling...");
          screenshotImage = await screenshotImage.scale(scaleProvider.getScaleRatio());
          await this._debugScreenshotsProvider.save(screenshotImage, "scaled");
        }

        const cutProvider = this._cutProviderHandler.get();
        if (!(cutProvider instanceof NullCutProvider)) {
          this._logger.verbose("cutting...");
          const screenshotImage = await cutProvider.cut(screenshotImage);
          await this._debugScreenshotsProvider.save(screenshotImage, "cut");
        }

        this._logger.verbose("Creating screenshot object...");
        const screenshot = new EyesWDIOScreenshot(this._logger, this._driver, screenshotImage, this.getPromiseFactory());
        result = screenshot.init();
      }

      return result;
    } catch (e) {
      throw e;
    } finally {
      if (originalBodyOverflow) {
        await EyesWDIOUtils.setBodyOverflow(this._jsExecutor, originalBodyOverflow);
      }
      this._logger.verbose("Done!");
    }
  }


  /**
   *
   * @returns {Promise.<*>}
   */
  async updateScalingParams() {
    if (this._devicePixelRatio === Eyes.UNKNOWN_DEVICE_PIXEL_RATIO && this._scaleProviderHandler.get() instanceof NullScaleProvider) {
      let factory;
      this._logger.verbose('Trying to extract device pixel ratio...');

      try {
        this._devicePixelRatio = await EyesWDIOUtils.getDevicePixelRatio(this.jsExecutor);
      } catch (e) {
        this._logger.verbose('Failed to extract device pixel ratio! Using default.', e);
        this._devicePixelRatio = Eyes.DEFAULT_DEVICE_PIXEL_RATIO;
      }

      this._logger.verbose('Device pixel ratio: ' + this._devicePixelRatio);
      this._logger.verbose('Setting scale provider..');
      const entireSize = await this._positionProvider.getEntireSize();

      try {
        const enSize = new RectangleSize(entireSize.getWidth(), entireSize.getHeight());
        const viewportSize = await this.getViewportSize();

        const vpSize = new RectangleSize(viewportSize.getWidth(), viewportSize.getHeight());
        factory = new ContextBasedScaleProviderFactory(this._logger, enSize, vpSize, this._devicePixelRatio, this._driver.webDriver.isMobile, this._scaleProviderHandler);
      } catch (e) {
        // This can happen in Appium for example.
        this._logger.verbose('Failed to set ContextBasedScaleProvider.', e);
        this._logger.verbose('Using FixedScaleProvider instead...');
        factory = new FixedScaleProviderFactory(1 / this._devicePixelRatio, this._scaleProviderHandler);
      }

      this._logger.verbose('Done!');
      return factory;
    } else {
      // If we already have a scale provider set, we'll just use it, and pass a mock as provider handler.
      return new ScaleProviderIdentityFactory(this._scaleProviderHandler.get(), new SimplePropertyHandler());
    }
  };


  /**
   * @private
   * @param {WebElement} element
   * @return {Promise}
   */
  async _ensureElementVisible(element) {
    if (!element) {
      // No element? we must be checking the window.
      return this.getPromiseFactory().resolve();
    }

    const originalFC = new FrameChain(this._logger, this._driver.getFrameChain());
    const switchTo = this._driver.switchTo();

    let elementBounds;
    const eyesRemoteWebElement = new EyesWebElement(this._logger, this._driver, element);
    const bounds = await eyesRemoteWebElement.getBounds();
    const currentFrameOffset = originalFC.getCurrentFrameOffset();
    elementBounds = bounds.offset(currentFrameOffset.getX(), currentFrameOffset.getY());
    const viewportBounds = await this._getViewportScrollBounds();

    if (!viewportBounds.contains(elementBounds)) {
      let elementLocation;
      await this._ensureFrameVisible();
      const p = await element.getLocation();

      elementLocation = new Location(p.getX(), p.getY());

      if (originalFC.size() > 0) {
        const equals = await EyesWebElement.equals(element, originalFC.peek().getReference());
        if (!equals) {
          await switchTo.frames(originalFC);
        }
      }

      return this._positionProvider.setPosition(elementLocation);
    }
  }


  /**
   * @return {Promise.<FrameChain>}
   */
  async _ensureFrameVisible() {
    const originalFC = new FrameChain(this._logger, this._driver.getFrameChain());
    const fc = new FrameChain(this._logger, this._driver.getFrameChain());
    await ensureFrameVisibleLoop(this._positionProvider, fc, this._driver.switchTo(), this.getPromiseFactory());
    await this._driver.switchTo().frames(originalFC);
    return originalFC;
  }


  /**
   * @private
   * @return {Promise.<Region>}
   */
  async _getViewportScrollBounds() {
    const originalFrameChain = new FrameChain(this._logger, this._driver.getFrameChain());
    const switchTo = this._driver.switchTo();
    await switchTo.defaultContent();
    const spp = new ScrollPositionProvider(this._logger, this._jsExecutor);
    const location = await spp.getCurrentPosition();
    const size = await this.getViewportSize();
    const viewportBounds = new Region(location, size);
    await switchTo.frames(originalFrameChain);
    return viewportBounds;
  }


  setViewportSize(size) {
    // noinspection JSUnusedGlobalSymbols
    this._viewportSize = size;
    return EyesWDIOUtils.setViewportSize(this._logger, this._driver, size);
  };


  // noinspection JSUnusedGlobalSymbols
  async getInferredEnvironment() {
    const res = 'useragent:';
    try {
      const {value: userAgent} = await this.jsExecutor.executeScript('return navigator.userAgent');
      return res + userAgent;
    } catch (e) {
      return res;
    }
  };


  // noinspection JSUnusedGlobalSymbols
  /**
   * @override
   */
  getBaseAgentId() {
    return `eyes.webdriverio/${VERSION}`;
  };


  //noinspection JSUnusedGlobalSymbols
  /**
   * Set the failure report.
   * @param {FailureReports} mode Use one of the values in FailureReports.
   */
  setFailureReport(mode) {
    if (mode === FailureReports.IMMEDIATE) {
      this._failureReportOverridden = true;
      mode = FailureReports.ON_CLOSE;
    }

    super.setFailureReport(mode);
  };

  // noinspection JSUnusedGlobalSymbols
  /**
   * Set the image rotation degrees.
   * @param degrees The amount of degrees to set the rotation to.
   * @deprecated use {@link setRotation} instead
   */
  setForcedImageRotation(degrees) {
    this.setRotation(new ImageRotation(degrees))
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Get the rotation degrees.
   * @return {number} The rotation degrees.
   * @deprecated use {@link getRotation} instead
   */
  getForcedImageRotation() {
    return this.getRotation().getRotation();
  }

  /**
   * @param {ImageRotation} rotation The image rotation data.
   */
  setRotation(rotation) {
    this._rotation = rotation;
    if (this._driver) {
      this._driver.setRotation(rotation);
    }
  }

  // noinspection JSUnusedGlobalSymbols
  getAUTSessionId() {
    if (!this._driver) {
      return undefined;
    }

    return this.getPromiseFactory().resolve(this.getRemoteWebDriver().requestHandler.sessionID);
  };


  getTitle() {
    return this._driver.getTitle();
  };

  getRemoteWebDriver() {
    return this._driver.webDriver.remoteWebDriver;
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Forces a full page screenshot (by scrolling and stitching) if the browser only supports viewport screenshots).
   *
   * @param {boolean} shouldForce Whether to force a full page screenshot or not.
   */
  setForceFullPageScreenshot(shouldForce) {
    this._forceFullPageScreenshot = shouldForce;
  }

  //noinspection JSUnusedGlobalSymbols
  /**
   * @return {boolean} Whether Eyes should force a full page screenshot.
   */
  getForceFullPageScreenshot() {
    return this._forceFullPageScreenshot;
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   *
   * @returns {Region}
   */
  get regionToCheck() {
    return this._regionToCheck;
  }


  /**
   *
   * @param {Region} regionToCheck
   */
  setRegionToCheck(regionToCheck) {
    this._regionToCheck = regionToCheck;
  }

  /**
   * @return {int} The time to wait just before taking a screenshot.
   */
  getWaitBeforeScreenshots() {
    return this._waitBeforeScreenshots;
  }

  /**
   * @return {PositionProvider} The currently set position provider.
   */
  getElementPositionProvider() {
    return this._elementPositionProvider ? this._elementPositionProvider : this._positionProvider;
  }

  /**
   * @return {?EyesWebDriver}
   */
  getDriver() {
    return this._driver;
  }

  /**
   * @return {int} Returns the stitching overlap in pixels.
   */
  getStitchOverlap() {
    return this._stitchingOverlap;
  }

  /**
   * @return {number} The device pixel ratio, or {@link #UNKNOWN_DEVICE_PIXEL_RATIO} if the DPR is not known yet or if it wasn't possible to extract it.
   */
  getDevicePixelRatio() {
    return this._devicePixelRatio;
  }

  /**
   * @return {boolean}
   */
  shouldStitchContent() {
    return this._stitchContent;
  }


  /**
   * Set the type of stitching used for full page screenshots. When the page includes fixed position header/sidebar, use {@link StitchMode#CSS}.
   * Default is {@link StitchMode#SCROLL}.
   *
   * @param {StitchMode} mode The stitch mode to set.
   */
  setStitchMode(mode) {
    this._logger.verbose(`setting stitch mode to ${mode}`);

    this._stitchMode = mode;
    if (this._driver) {
      this._initPositionProvider();
    }
  }


  /**
   * Hide the scrollbars when taking screenshots.
   *
   * @param {boolean} shouldHide Whether to hide the scrollbars or not.
   */
  setHideScrollbars(shouldHide) {
    this._hideScrollbars = shouldHide;
  }

  getScreenshotUrl() {
    return this.getPromiseFactory().resolve(undefined);
  }
}

/**
 * @param positionProvider
 * @param frameChain
 * @param switchTo
 * @param promiseFactory
 * @return {Promise}
 */
async function ensureFrameVisibleLoop(positionProvider, frameChain, switchTo, promiseFactory) {
  await promiseFactory.resolve();
  if (frameChain.size() > 0) {
    await switchTo.parentFrame();
    const frame = frameChain.pop();
    await positionProvider.setPosition(frame.getLocation());

    return ensureFrameVisibleLoop(positionProvider, frameChain, switchTo, promiseFactory);
  }
}

module.exports = Eyes;
