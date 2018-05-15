'use strict';

const {
  BrowserNames,
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
const ReadOnlyPropertyHandler = require("@applitools/eyes.sdk.core/index").ReadOnlyPropertyHandler;

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
    /** @type {Region} */
    this._effectiveViewport = Region.EMPTY;
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
  open(driver, appName, testName, viewportSize = null, sessionType = null) {
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

    const that = this;
    return this._driver.getUserAgent().then(userAgentString => {
      if (userAgentString) {
        that._userAgent = UserAgent.parseUserAgentString(userAgentString, true);
      }

      that._imageProvider = ImageProviderFactory.getImageProvider(that._userAgent, that, that._logger, that._driver);
      that._regionPositionCompensation = RegionPositionCompensationFactory.getRegionPositionCompensation(that._userAgent, that, that._logger);

      that._jsExecutor = new WDIOJSExecutor(that._driver);

      return that.openBase(appName, testName, viewportSize, sessionType);
    }).then(() => {
      that._devicePixelRatio = Eyes.UNKNOWN_DEVICE_PIXEL_RATIO;

      that._initPositionProvider();

      that._driver.rotation = that._rotation;

      return that._driver;
    });
  }


  /**
   * @private
   * @return {Promise<ScaleProviderFactory>}
   */
  _getScaleProviderFactory() {
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
  checkRegionInFrame(frameNameOrId, selector, matchTimeout = USE_DEFAULT_MATCH_TIMEOUT, tag, stitchContent) {
    return this.check(tag, Target.region(selector, frameNameOrId).timeout(matchTimeout).stitchContent(stitchContent));
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
   * @param name
   * @param {WebdriverioCheckSettings} checkSettings
   * @returns {Promise.<*>}
   */
  check(name, checkSettings) {
    ArgumentGuard.notNull(checkSettings, "checkSettings");

    let result;
    const that = this;
    return that._positionProvider.setPosition(Location.ZERO).then(() => {
      that._logger.verbose(`check("${name}", checkSettings) - begin`);
      that._stitchContent = checkSettings.getStitchContent();
      const targetRegion = checkSettings.getTargetRegion();

      let switchedToFrameCount;
      return this._switchToFrame(checkSettings).then(switchedToFrameCount_ => {
        switchedToFrameCount = switchedToFrameCount_;
        that._regionToCheck = null;

        if (targetRegion) {
          return this._tryHideScrollbars().then(() => {
            return super.checkWindowBase(new RegionProvider(targetRegion, that.getPromiseFactory()), name, false, checkSettings);
          });
        }

        if (checkSettings) {
          const targetSelector = checkSettings.targetSelector;
          let targetElement = checkSettings.targetElement;
          if (!targetElement && targetSelector) {
            targetElement = that._driver.findElement(targetSelector);
          }

          if (targetElement && !targetElement.then) {
            targetElement = that.getPromiseFactory().resolve(targetElement);
          } else {
            targetElement = Promise.resolve(targetElement);
          }

          return targetElement.then(targetElement_ => {
            targetElement = targetElement_;
            if (targetElement) {
              that._targetElement = targetElement instanceof EyesWebElement ? targetElement : new EyesWebElement(that._logger, that._driver, targetElement);
              if (that._stitchContent) {
                return that._checkElement(name, checkSettings);
              } else {
                return that._checkRegion(name, checkSettings);
              }
            } else if (checkSettings.getFrameChain().length > 0) {
              if (that._stitchContent) {
                return that._checkFullFrameOrElement(name, checkSettings);
              } else {
                return that._checkFrameFluent(name, checkSettings);
              }
            } else {
              let res;
              let originalPosition;

              return this._driver.switchTo().defaultContent().then(() => {
                return that._positionProvider.getState();
              }).then(originalPosition_ => {
                originalPosition = originalPosition_;
                return that._positionProvider.setPosition(Location.ZERO);
              }).then(() => {
                return that._tryHideScrollbars();
              }).then(() => {
                return super.checkWindowBase(new NullRegionProvider(that.getPromiseFactory()), name, false, checkSettings);
              }).then(res_ => {
                res = res_;
                return that._positionProvider.restoreState(originalPosition);
              }).then(() => {
                return res;
              });
            }
          });
        }
      }).then(r => {
        result = r;
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
      getRegion() {
        return that._targetElement.getLocation().then(p => {
          return that._targetElement.getSize().then(d => {
            return new Region(Math.ceil(p.getX()), Math.ceil(p.getY()), d.getWidth(), d.getHeight(), CoordinatesType.CONTEXT_RELATIVE);
          });
        });
      }
    };

    return super.checkWindowBase(new RegionProviderImpl(), name, false, checkSettings).then(r => {
      that._logger.verbose("Done! trying to scroll back to original position..");
      return r;
    });
  }


  /**
   * @private
   * @return {Promise}
   */
  _checkElement(name, checkSettings) {
    const eyesElement = this._targetElement;

    this._regionToCheck = null;
    let originalPositionMemento;

    let result;
    const that = this;
    let originalScrollPosition, originalOverflow, error;
    const originalPositionProvider = this._positionProvider;
    const scrollPositionProvider = new ScrollPositionProvider(this._logger, this._jsExecutor);

    return this._positionProvider.getState().then(originalPositionMemento_ => {
      originalPositionMemento = originalPositionMemento_;

      return this._ensureElementVisible(eyesElement);
    }).then(() => {
      // return Promise.resolve().then(() => {
      return scrollPositionProvider.getCurrentPosition();
    }).then(originalScrollPosition_ => {
      originalScrollPosition = originalScrollPosition_;
      return eyesElement.getLocation();
    }).then(pl => {
      that._checkFrameOrElement = true;

      let elementLocation, elementSize;
      return eyesElement.getComputedStyle("display").then(displayStyle => {
        if (displayStyle !== "inline") {
          that._elementPositionProvider = new ElementPositionProvider(that._logger, that._driver, eyesElement);
        } else {
          that._elementPositionProvider = null;
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
        const elementRegion = new Region(elementLocation, elementSize, CoordinatesType.CONTEXT_AS_IS);

        that._logger.verbose("Element region: " + elementRegion);

        that._logger.verbose("replacing regionToCheck");
        that._regionToCheck = elementRegion;

        if (!(that._effectiveViewport.getWidth() <= 0 || that._effectiveViewport.getHeight() <= 0)) {
          that._regionToCheck.intersect(that._effectiveViewport);
        }

        return super.checkWindowBase(new NullRegionProvider(that.getPromiseFactory()), name, false, checkSettings);
      });
    }).catch(error_ => {
      error = error_;
    }).then(r => {
      result = r;
      if (originalOverflow) {
        return eyesElement.setOverflow(originalOverflow);
      }
    }).then(() => {
      that._checkFrameOrElement = false;
      that._positionProvider = originalPositionProvider;
      that._regionToCheck = null;
      that._elementPositionProvider = null;

      return originalPositionProvider.restoreState(originalPositionMemento);
    }).then(() => {
      return scrollPositionProvider.setPosition(originalScrollPosition);
    }).then(() => {
      if (error) {
        throw error;
      }

      return result;
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
      getRegion() {
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
                // return screenshot.getFrameWindow();
                return that.getPromiseFactory().resolve(Region.EMPTY);
              });
            });
          });
        }

        return that.getPromiseFactory().resolve(Region.EMPTY);
      }
    };

    return super.checkWindowBase(new RegionProviderImpl(), name, false, checkSettings).then(r => {
      that._checkFrameOrElement = false;
      return r;
    });
  }


  /**
   * @private
   * @return {Promise}
   */
  _checkFrameFluent(name, checkSettings) {
    const frameChain = new FrameChain(this._logger, this._driver.getFrameChain());
    const targetFrame = frameChain.pop();
    this._targetElement = targetFrame.getReference();

    const that = this;
    return this._driver.switchTo().framesDoScroll(frameChain).then(() => {
      return this._checkRegion(name, checkSettings);
    }).then(r => {
      that._targetElement = null;
      return r;
    });
  }


  /**
   * @private
   * @return {Promise.<int>}
   */
  _switchToParentFrame(switchedToFrameCount) {
    if (switchedToFrameCount > 0) {
      const that = this;
      return that._driver.switchTo().parentFrame().then(() => {
        switchedToFrameCount--;
        return that._switchToParentFrame(switchedToFrameCount);
      });
    }

    return this.getPromiseFactory().resolve();
  }

  /**
   * @private
   * @return {Promise.<int>}
   */
  _switchToFrame(checkSettings) {
    if (!checkSettings) {
      return this.getPromiseFactory().resolve(0);
    }

    const that = this;
    const frameChain = checkSettings.getFrameChain();
    let switchedToFrameCount = 0;
    return frameChain.reduce((promise, frameLocator) => {
      return promise.then(() => that._switchToFrameLocator(frameLocator)).then(isSuccess => {
        if (isSuccess) {
          switchedToFrameCount++;
        }
        return switchedToFrameCount;
      });
    }, this.getPromiseFactory().resolve());
  }


  /**
   * @private
   * @return {Promise.<boolean>}
   */
  _switchToFrameLocator(frameLocator) {
    const switchTo = this._driver.switchTo();

    if (frameLocator.getFrameIndex()) {
      return switchTo.frame(frameLocator.getFrameIndex()).then(() => true);
    }

    if (frameLocator.getFrameNameOrId()) {
      return switchTo.frame(frameLocator.getFrameNameOrId()).then(() => true);
    }

    if (frameLocator.getFrameSelector()) {
      const frameElement = this._driver.findElement(frameLocator.getFrameSelector());
      if (frameElement) {
        return switchTo.frame(frameElement).then(() => true);
      }
    }

    return this.getPromiseFactory().resolve(false);
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

    EyesBase.prototype.addMouseTriggerBase.call(this, action, control, cursor);
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
      EyesBase.prototype.addMouseTriggerBase.call(this, action, elementRegion, elementRegion.getMiddleOffset());
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

    EyesBase.prototype.addTextTriggerBase.call(this, control, text);
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
        EyesBase.prototype.addTextTrigger.call(this, elementRegion, text);
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
      return Promise.resolve();
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
      that._effectiveViewport = new Region(Location.ZERO, viewportSize);

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
  getRegionByLocator(locator) {
    let element;
    let elementSize;
    let point;
    return this._driver.findElement(locator).then(element_ => {
      element = element_;
      return element.getSize();
    }).then(elementSize_ => {
      elementSize = elementSize_;
      return element.getLocation();
    }).then(point_ => {
      point = point_;
      return new Region(point.x, point.y, elementSize.width, elementSize.height);
    });
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
  _tryHideScrollbars() {
    if (this._hideScrollbars) {
      const that = this;
      const originalFC = new FrameChain(that._logger, that._driver.getFrameChain());
      const fc = new FrameChain(that._logger, that._driver.getFrameChain());
      return EyesWDIOUtils.hideScrollbars(that._jsExecutor, 200).then(overflow => {
        that._originalOverflow = overflow;
        return that._tryHideScrollbarsLoop(fc);
      }).then(() => {
        return that._driver.switchTo().frames(originalFC);
      }).catch(err => {
        that._logger.log("WARNING: Failed to hide scrollbars! Error: " + err);
      });
    }

    return this.getPromiseFactory().resolve();
  }

  /**
   * @private
   * @param {FrameChain} fc
   * @return {Promise}
   */
  _tryHideScrollbarsLoop(fc) {
    if (fc.size() > 0) {
      const that = this;
      return that._driver.getRemoteWebDriver().switchTo().parentFrame().then(() => {
        const frame = fc.pop();
        return EyesWDIOUtils.hideScrollbars(that._jsExecutor, 200);
      }).then(() => {
        return that._tryHideScrollbarsLoop(fc);
      });
    }

    return this.getPromiseFactory().resolve();
  }

  /**
   * @private
   * @return {Promise}
   */
  _tryRestoreScrollbars() {
    if (this._hideScrollbars) {
      const that = this;
      const originalFC = new FrameChain(that._logger, that._driver.getFrameChain());
      const fc = new FrameChain(that._logger, that._driver.getFrameChain());
      return that._tryRestoreScrollbarsLoop(fc).then(() => {
        return that._driver.switchTo().frames(originalFC);
      });
    }
  }

  /**
   * @private
   * @param {FrameChain} fc
   * @return {Promise}
   */
  _tryRestoreScrollbarsLoop(fc) {
    if (fc.size() > 0) {
      const that = this;
      return that._driver.getRemoteWebDriver().switchTo().parentFrame().then(() => {
        const frame = fc.pop();
        return frame.getReference().setOverflow(frame.getOriginalOverflow());
      }).then(() => {
        return that._tryRestoreScrollbarsLoop(fc);
      });
    }

    return this.getPromiseFactory().resolve();
  }


  /**
   *
   * @returns {Promise.<EyesWDIOScreenshot>}
   * @override
   */
  getScreenshot() {
    const that = this;
    that._logger.verbose("getScreenshot()");

    let result, scaleProviderFactory, originalBodyOverflow, error;
    return that._updateScalingParams().then(scaleProviderFactory_ => {
      scaleProviderFactory = scaleProviderFactory_;

      const screenshotFactory = new EyesWDIOScreenshotFactory(that._logger, that._driver, that.getPromiseFactory());

      const originalFrameChain = new FrameChain(that._logger, that._driver.getFrameChain());
      const algo = new FullPageCaptureAlgorithm(that._logger, that._userAgent, that._jsExecutor, that.getPromiseFactory());
      const switchTo = that._driver.switchTo();

      if (that._checkFrameOrElement) {
        that._logger.verbose("Check frame/element requested");
        return switchTo.framesDoScroll(originalFrameChain).then(() => {
          return algo.getStitchedRegion(
            that._imageProvider, that._regionToCheck, that._positionProvider,
            that.getElementPositionProvider(), scaleProviderFactory, that._cutProviderHandler.get(),
            that.getWaitBeforeScreenshots(), that._debugScreenshotsProvider, screenshotFactory,
            that.getStitchOverlap(), that._regionPositionCompensation);
        }).then(entireFrameOrElement => {
          that._logger.verbose("Building screenshot object...");
          const screenshot = new EyesWDIOScreenshot(that._logger, that._driver, entireFrameOrElement, that.getPromiseFactory());
          return screenshot.initFromFrameSize(new RectangleSize(entireFrameOrElement.getWidth(), entireFrameOrElement.getHeight()));
        }).then(screenshot => {
          result = screenshot;
        });

      } else if (that._forceFullPageScreenshot || that._stitchContent) {
        that._logger.verbose("Full page screenshot requested.");

        // Save the current frame path.
        const originalFramePosition = originalFrameChain.size() > 0 ? originalFrameChain.getDefaultContentScrollPosition() : new Location(0, 0);

        return switchTo.defaultContent().then(() => {
          return algo.getStitchedRegion(
            that._imageProvider, Region.EMPTY, new ScrollPositionProvider(that._logger, this._jsExecutor),
            that._positionProvider, scaleProviderFactory, that._cutProviderHandler.get(), that.getWaitBeforeScreenshots(),
            that._debugScreenshotsProvider, screenshotFactory, that.getStitchOverlap(), that._regionPositionCompensation
          ).then(fullPageImage => {
            return switchTo.frames(originalFrameChain).then(() => {
              const screenshot = new EyesWDIOScreenshot(that._logger, that._driver, fullPageImage, that.getPromiseFactory());
              return screenshot.init(null, originalFramePosition);
            }).then(screenshot => {
              result = screenshot;
            });
          });
        });
      }

      let screenshotImage;
      return that._ensureElementVisible(that._targetElement).then(() => {
        that._logger.verbose("Screenshot requested...");
        return that._imageProvider.getImage();
      }).then(/** @type {MutableImage}*/screenshotImage_ => {
        // workaround: crop the image to viewport size if the browser is firefox version < 48
        if (that._viewportSizeHandler.get() && that._userAgent.getBrowser() === BrowserNames.Firefox && parseInt(that._userAgent.getBrowserMajorVersion(), 10) < 48) {
          const region = new Region(Location.ZERO, that._viewportSizeHandler.get());
          return screenshotImage_.crop(region);
        } else {
          return Promise.resolve(screenshotImage_);
        }
      }).then(screenshotImage_ => {
        screenshotImage = screenshotImage_;
        return that._debugScreenshotsProvider.save(screenshotImage, "original");
      }).then(() => {
        const scaleProvider = scaleProviderFactory.getScaleProvider(screenshotImage.getWidth());
        if (scaleProvider.getScaleRatio() !== 1) {
          that._logger.verbose("scaling...");
          return screenshotImage.scale(scaleProvider.getScaleRatio()).then(screenshotImage_ => {
            screenshotImage = screenshotImage_;
            return that._debugScreenshotsProvider.save(screenshotImage, "scaled");
          });
        }
      }).then(() => {
        const cutProvider = that._cutProviderHandler.get();
        if (!(cutProvider instanceof NullCutProvider)) {
          that._logger.verbose("cutting...");
          return cutProvider.cut(screenshotImage).then(screenshotImage_ => {
            screenshotImage = screenshotImage_;
            return that._debugScreenshotsProvider.save(screenshotImage, "cut");
          });
        }
      }).then(() => {
        that._logger.verbose("Creating screenshot object...");
        const screenshot = new EyesWDIOScreenshot(that._logger, that._driver, screenshotImage, that.getPromiseFactory());
        return screenshot.init();
      }).then(screenshot => {
        result = screenshot;
      });
    }).catch(error_ => {
      error = error_;
    }).then(() => {
      if (originalBodyOverflow) {
        return EyesWDIOUtils.setBodyOverflow(that._jsExecutor, originalBodyOverflow);
      }
    }).then(() => {
      if (error) {
        throw error;
      }

      that._logger.verbose("Done!");
      return result;
    });
  }


  /**
   *
   * @returns {Promise.<*>}
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
   * @param {WebElement} element
   * @return {Promise}
   */
  _ensureElementVisible(element) {
    if (!element) {
      // No element? we must be checking the window.
      return this.getPromiseFactory().resolve();
    }

    const originalFC = new FrameChain(this._logger, this._driver.getFrameChain());
    const switchTo = this._driver.switchTo();

    const that = this;
    let elementBounds;
    const eyesRemoteWebElement = new EyesWebElement(this._logger, this._driver, element);
    return eyesRemoteWebElement.getBounds().then(bounds => {
      const currentFrameOffset = originalFC.getCurrentFrameOffset();
      elementBounds = bounds.offset(currentFrameOffset.getX(), currentFrameOffset.getY());
      return that._getViewportScrollBounds();
    }).then(viewportBounds => {
      if (!viewportBounds.contains(elementBounds)) {
        let elementLocation;
        return that._ensureFrameVisible().then(() => {
          return element.getLocation();
        }).then(l => {
          elementLocation = l;

          return EyesWebElement.equals(element, originalFC.peek());
        }).then(equals => {
          if (originalFC.size() > 0 && !equals) {
            return switchTo.frames(originalFC);
          }
        }).then(() => {
          return that._positionProvider.setPosition(elementLocation);
        });
      }
    });
  }


  /**
   * @return {Promise.<FrameChain>}
   */
  _ensureFrameVisible() {
    const that = this;
    const originalFC = new FrameChain(this._logger, this._driver.getFrameChain());
    const fc = new FrameChain(this._logger, this._driver.getFrameChain());
    // noinspection JSValidateTypes
    return ensureFrameVisibleLoop(this, this._positionProvider, fc, this._driver.switchTo(), this.getPromiseFactory()).then(() => {
      return that._driver.switchTo().frames(originalFC);
    }).then(() => originalFC);
  }


  /**
   * @private
   * @return {Promise.<Region>}
   */
  _getViewportScrollBounds() {
    const that = this;
    const originalFrameChain = new FrameChain(this._logger, this._driver.getFrameChain());
    const switchTo = this._driver.switchTo();
    return switchTo.defaultContent().then(() => {
      const spp = new ScrollPositionProvider(that._logger, that._jsExecutor);
      return spp.getCurrentPosition().then(location => {
        return that.getViewportSize().then(size => {
          const viewportBounds = new Region(location, size);
          return switchTo.frames(originalFrameChain).then(() => viewportBounds);
        });
      });
    });
  }


  // noinspection JSUnusedGlobalSymbols
  getInferredEnvironment() {
    return this._driver.getUserAgent().then(userAgent => "useragent:" + userAgent).catch(() => null);
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

    EyesBase.prototype.setFailureReport.call(this, mode);
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
 * @param that
 * @param positionProvider
 * @param frameChain
 * @param switchTo
 * @param promiseFactory
 * @return {Promise}
 */
function ensureFrameVisibleLoop(that, positionProvider, frameChain, switchTo, promiseFactory) {
  return promiseFactory.resolve().then(() => {
    if (frameChain.size() > 0) {
      return switchTo.parentFrame().then(() => {
        const frame = frameChain.pop();

        const reg = new Region(Location.ZERO, frame.getInnerSize());
        that._effectiveViewport.intersect(reg);

        return positionProvider.setPosition(frame.getLocation());
      }).then(() => {
        return ensureFrameVisibleLoop(that, positionProvider, frameChain, switchTo, promiseFactory);
      });
    }
  });
}

module.exports = Eyes;
