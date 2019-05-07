'use strict';

const {
  ContextBasedScaleProviderFactory,
  CoordinatesType,
  EyesBase,
  FailureReports,
  FixedCutProvider,
  FixedScaleProviderFactory,
  FullPageCaptureAlgorithm,
  Location,
  MutableImage,
  NullCutProvider,
  NullScaleProvider,
  NullRegionProvider,
  ScaleProviderIdentityFactory,
  RectangleSize,
  Region,
  RegionProvider,
  TestFailedError,
  TypeUtils,
  UserAgent,
  ArgumentGuard,
  SimplePropertyHandler
} = require('@applitools/eyes-sdk-core');

const {DomCapture} = require('@applitools/dom-utils');
const {Configuration} = require('@applitools/eyes-selenium');

const ImageProviderFactory = require('./capture/ImageProviderFactory');
const CssTranslatePositionProvider = require('./positioning/CssTranslatePositionProvider');
const CssTranslateElementPositionProvider = require('./positioning/CssTranslateElementPositionProvider');
const ScrollPositionProvider = require('./positioning/ScrollPositionProvider');
const RegionPositionCompensationFactory = require('./positioning/RegionPositionCompensationFactory');
const EyesWebDriver = require('./wrappers/EyesWebDriver');
const EyesWebElement = require('./wrappers/EyesWebElement');
const EyesWDIOScreenshot = require('./capture/EyesWDIOScreenshot');
const FrameChain = require('./frames/FrameChain');
const EyesWDIOScreenshotFactory = require('./capture/EyesWDIOScreenshotFactory');
const EyesWDIOUtils = require('./EyesWDIOUtils');
const ElementPositionProvider = require('./positioning/ElementPositionProvider');
const StitchMode = require('./StitchMode');
const Target = require('./fluent/Target');
const WDIOJSExecutor = require('./WDIOJSExecutor');
const WebDriver = require('./wrappers/WebDriver');
const ReadOnlyPropertyHandler = require("@applitools/eyes-sdk-core/index").ReadOnlyPropertyHandler;

const VERSION = require('../package.json').version;


const DEFAULT_STITCHING_OVERLAP = 50; // px
const DEFAULT_WAIT_BEFORE_SCREENSHOTS = 100; // Milliseconds
// noinspection JSUnusedLocalSymbols
const DEFAULT_WAIT_SCROLL_STABILIZATION = 200; // Milliseconds


class EyesWDIO extends EyesBase {

  static get UNKNOWN_DEVICE_PIXEL_RATIO() {
    return 0;
  }

  static get DEFAULT_DEVICE_PIXEL_RATIO() {
    return 1;
  }

  /**
   * Creates a new (possibly disabled) Eyes instance that interacts with the Eyes Server at the specified url.
   *
   * @param {String} [serverUrl] The Eyes server URL.
   * @param {Boolean} [isDisabled=false] Set to true to disable Applitools Eyes and use the webdriver directly.
   **/
  constructor(serverUrl, isDisabled = false) {
    super(serverUrl, isDisabled, new Configuration());

    /** @type {EyesWebDriver} */
    this._driver = undefined;
    /** @type {boolean} */
    this._dontGetTitle = false;

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
    /** @type {ImageProvider} */
    this._imageProvider = undefined;
    /** @type {RegionPositionCompensation} */
    this._regionPositionCompensation = undefined;
    /** @type {number} */
    this._devicePixelRatio = EyesWDIO.UNKNOWN_DEVICE_PIXEL_RATIO;
    /** @type {Region} */
    this._regionToCheck = null;
    /** @type {EyesWebElement} */
    this._targetElement = null;
    /** @type {Location} */
    this._targetElementLocation = null;
    /** @type {ElementPositionProvider} */
    this._elementPositionProvider = undefined;
    /** @type {int} */
    this._waitBeforeScreenshots = DEFAULT_WAIT_BEFORE_SCREENSHOTS;
    /** @type {int} */
    this._stitchingOverlap = DEFAULT_STITCHING_OVERLAP;
    /** @type {Region} */
    this._effectiveViewport = Region.EMPTY;
    /** @type {string}*/
    this._domUrl;
    /** @type {EyesWDIOScreenshotFactory} */
    this._screenshotFactory = undefined;
    /** @type {WebElement} */
    this._scrollRootElement = undefined;
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   * @param {Object} driver
   * @param {String} [varArg1] - Application name
   * @param {String} [varArg2] - Test name
   * @param {RectangleSize|{width: number, height: number}} [varArg3] - Viewport size
   * @param {SessionType} [varArg4=null] - The type of test (e.g.,  standard test / visual performance test).
   * @returns {Promise<EyesWebDriver|object>}
   */
  async open(driver, varArg1, varArg2, varArg3 = null, varArg4 = null) {
    ArgumentGuard.notNull(driver, 'driver');

    this._logger.verbose('Running using Webdriverio module');

    this._driver = driver instanceof EyesWebDriver ? driver : new EyesWebDriver(this._logger, new WebDriver(driver), this);
    this._jsExecutor = new WDIOJSExecutor(this._driver);

    if (varArg1 instanceof Configuration) {
      this._configuration.mergeConfig(varArg1);
    } else {
      this._configuration.setAppName(TypeUtils.getOrDefault(varArg1, this._configuration.getAppName()));
      this._configuration.setTestName(TypeUtils.getOrDefault(varArg2, this._configuration.getTestName()));
      this._configuration.setViewportSize(TypeUtils.getOrDefault(varArg3, this._configuration.getViewportSize()));
      this._configuration.setSessionType(TypeUtils.getOrDefault(varArg4, this._configuration.getSessionType()));
    }
    if (!this._configuration.getViewportSize()) {
      const vs = await this._driver.getDefaultContentViewportSize();
      this._configuration.setViewportSize(vs);
    }

    if (this._isDisabled) {
      this._logger.verbose('Ignored');
      return driver;
    }

    if (this._configuration.getStitchMode() === StitchMode.CSS) {
      this.setSendDom(true);
    }

    if (driver && driver.isMobile) { // set viewportSize to null if browser is mobile
      varArg3 = null;
    }

    this._screenshotFactory = new EyesWDIOScreenshotFactory(this._logger, this._driver);

    const userAgentString = await this._driver.getUserAgent();
    if (userAgentString) {
      this._userAgent = UserAgent.parseUserAgentString(userAgentString, true);
    }

    this._imageProvider = ImageProviderFactory.getImageProvider(this._userAgent, this, this._logger, this._driver);
    this._regionPositionCompensation = RegionPositionCompensationFactory.getRegionPositionCompensation(this._userAgent, this, this._logger);

    await this.openBase(this._configuration.getAppName(), this._configuration.getTestName(), this._configuration.getViewportSize(), this._configuration.getSessionType());

    this._devicePixelRatio = EyesWDIO.UNKNOWN_DEVICE_PIXEL_RATIO;

    this._initPositionProvider();

    this._driver.rotation = this._rotation;

    return this._driver;
  }


  /**
   * @private
   * @return {Promise<ScaleProviderFactory>}
   */
  async _getScaleProviderFactory() {
    const entireSize = await this.getPositionProvider().getEntireSize();
    return new ContextBasedScaleProviderFactory(this._logger, entireSize, this._viewportSizeHandler.get(), this._devicePixelRatio, false, this._scaleProviderHandler);
  }


  /**
   * Takes a snapshot of the application under test and matches it with the expected output.
   *
   * @param {String} tag An optional tag to be associated with the snapshot.
   * @param {int} matchTimeout The amount of time to retry matching (Milliseconds).
   * @return {Promise} A promise which is resolved when the validation is finished.
   */
  checkWindow(tag, matchTimeout) {
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
  checkFrame(element, matchTimeout, tag) {
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
  checkRegionBy(by, tag, matchTimeout) {
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
  checkRegionInFrame(frameNameOrId, selector, matchTimeout, tag, stitchContent) {
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
  async check(name, checkSettings) {
    ArgumentGuard.notNull(checkSettings, "checkSettings");

    this._checkSettings = checkSettings;

    let result;
    const that = this;
    return that.getPositionProvider().setPosition(Location.ZERO).then(() => {
      that._logger.verbose(`check("${name}", checkSettings) - begin`);
      that._stitchContent = checkSettings.getStitchContent();
      const targetRegion = checkSettings.getTargetRegion();

      let switchedToFrameCount;
      return this._switchToFrame(checkSettings).then(async (switchedToFrameCount_) => {
        switchedToFrameCount = switchedToFrameCount_;
        that._regionToCheck = null;
        that._targetElementLocation = null;

        if (targetRegion) {
          return this._tryHideScrollbars().then(async () => {
            that._targetElementLocation = targetRegion.getLocation();
            const res = await super.checkWindowBase(new RegionProvider(targetRegion), name, false, checkSettings);
            await that._tryRestoreScrollbars();
            return res;
          });
        }

        if (checkSettings) {
          const targetSelector = checkSettings.targetSelector;
          let targetElement = checkSettings.targetElement;
          if (!targetElement && targetSelector) {
            targetElement = await that._driver.findElement(targetSelector);
          }

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
              return that.getPositionProvider().getState();
            }).then(originalPosition_ => {
              originalPosition = originalPosition_;
              return that.getPositionProvider().setPosition(Location.ZERO);
            }).then(() => {
              return that._tryHideScrollbars();
            }).then(() => {
              return super.checkWindowBase(new NullRegionProvider(), name, false, checkSettings);
            }).then(res_ => {
              res = res_;
              return that.getPositionProvider().restoreState(originalPosition);
            }).then(() => {
              return that._tryRestoreScrollbars();
            }).then(() => {
              return res;
            });
          }
        }
      }).then(r => {
        result = r;
        that._targetElement = null;
        that._targetElementLocation = null;
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
  async _checkRegion(name, checkSettings) {
    const that = this;

    const RegionProviderImpl = class RegionProviderImpl extends RegionProvider {
      // noinspection JSUnusedGlobalSymbols
      /** @override */
      async getRegion() {
        const p = await that._targetElement.getLocation();
        that._targetElementLocation = p;
        const d = await that._targetElement.getSize();
        return new Region(Math.ceil(p.getX()), Math.ceil(p.getY()), d.getWidth(), d.getHeight(), CoordinatesType.CONTEXT_RELATIVE);
      }
    };

    const r = await super.checkWindowBase(new RegionProviderImpl(), name, false, checkSettings);
    this._logger.verbose("Done! trying to scroll back to original position..");
    return r;
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
    const originalPositionProvider = this.getPositionProvider();
    const scrollPositionProvider = new ScrollPositionProvider(this._logger, this._jsExecutor);

    return this.getPositionProvider().getState().then(originalPositionMemento_ => {
      originalPositionMemento = originalPositionMemento_;

      return this._ensureElementVisible(eyesElement);
    }).then(() => {
      return scrollPositionProvider.getCurrentPosition();
    }).then(originalScrollPosition_ => {
      originalScrollPosition = originalScrollPosition_;
      return eyesElement.getLocation();
    }).then(pl => {
      that._targetElementLocation = pl;
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

        // todo isSizeEmpty
        if (!(that._effectiveViewport.getWidth() <= 0 || that._effectiveViewport.getHeight() <= 0)) {
          that._regionToCheck.intersect(that._effectiveViewport);
        }

        const isElement = true;
        const insideAFrame = that.getDriver().getFrameChain().size() > 0;
        if (isElement && insideAFrame && that._configuration.getStitchMode() === StitchMode.CSS) {
          that.setPositionProvider(new CssTranslateElementPositionProvider(that._logger, that._driver, eyesElement));
        }

        return super.checkWindowBase(new NullRegionProvider(), name, false, checkSettings);
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
      that.setPositionProvider(originalPositionProvider);
      that._regionToCheck = null;
      that._elementPositionProvider = null;
      that._targetElementLocation = null;

      return originalPositionProvider.restoreState(originalPositionMemento);
    }).then(() => {
      if (originalScrollPosition) {
        return scrollPositionProvider.setPosition(originalScrollPosition);
      }
    }).then(() => {
      if (error) {
        throw error;
      }

      return result;
    });
  }


  /**
   * @return {Promise<number>}
   * @private
   */
  async _getMobilePixelRation() {
    const viewportSize = await this.getViewportSize();
    const s = await this.getDriver().takeScreenshot();
    const screenshot = new MutableImage(s);
    return screenshot.getWidth() / viewportSize.getWidth();
  }


  /**
   * Updates the state of scaling related parameters.
   *
   * @protected
   * @return {Promise.<ScaleProviderFactory>}
   */
  async _updateScalingParams() {
    // Update the scaling params only if we haven't done so yet, and the user hasn't set anything else manually.
    if (this._devicePixelRatio === EyesWDIO.UNKNOWN_DEVICE_PIXEL_RATIO && this._scaleProviderHandler.get() instanceof NullScaleProvider) {
      this._logger.verbose("Trying to extract device pixel ratio...");

      const that = this;
      return EyesWDIOUtils.getDevicePixelRatio(that._jsExecutor).then(ratio => {
        that._devicePixelRatio = ratio;
      }).catch(async (err) => {
        if (EyesWDIOUtils.isMobileDevice(that._driver.remoteWebDriver)) {
          const ratio = await that._getMobilePixelRation();
          that._devicePixelRatio = ratio;
        } else {
          throw err;
        }
      }).catch(err => {
        that._logger.verbose("Failed to extract device pixel ratio! Using default.", err);
        that._devicePixelRatio = EyesWDIO.DEFAULT_DEVICE_PIXEL_RATIO;
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
    return new ScaleProviderIdentityFactory(this._scaleProviderHandler.get(), nullProvider);
  }


  /**
   * @private
   * @return {Promise}
   */
  async _checkFullFrameOrElement(name, checkSettings) {
    this._checkFrameOrElement = true;

    const that = this;
    this._logger.verbose("checkFullFrameOrElement()");

    const RegionProviderImpl = class RegionProviderImpl extends RegionProvider {
      // noinspection JSUnusedGlobalSymbols
      /** @override */
      async getRegion() {
        const region = await that._getFullFrameOrElementRegion();
        that._targetElementLocation = region.getLocation();
        return region;
      }
    };

    const r = await super.checkWindowBase(new RegionProviderImpl(), name, false, checkSettings);
    that._checkFrameOrElement = false;
    return r;
  }


  async _getFullFrameOrElementRegion() {
    const that = this;
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
            const screenshot = new EyesWDIOScreenshot(that._logger, that._driver, screenshotImage);
            return screenshot.init();
          }).then(screenshot => {
            that._logger.verbose("replacing regionToCheck");
            that.setRegionToCheck(screenshot.getFrameWindow());
            // return screenshot.getFrameWindow();
            return Region.EMPTY;
          });
        });
      });
    }

    return Region.EMPTY;
  }

  /**
   * @private
   * @return {Promise}
   */
  async _checkFrameFluent(name, checkSettings) {
    const frameChain = new FrameChain(this._logger, this._driver.getFrameChain());
    const targetFrame = frameChain.pop();
    this._targetElement = targetFrame.getReference();

    await this._driver.switchTo().framesDoScroll(frameChain);
    const r = await this._checkRegion(name, checkSettings);
    this._targetElement = null;
    this._targetElementLocation = Location.ZERO;
    return r;
  }


  /**
   * @private
   * @return {Promise.<int>}
   */
  async _switchToParentFrame(switchedToFrameCount) {
    if (switchedToFrameCount > 0) {
      await this._driver.switchTo().parentFrame();
      return this._switchToParentFrame(switchedToFrameCount - 1);
    }

    return switchedToFrameCount;
  }

  /**
   * @private
   * @return {Promise.<int>}
   */
  async _switchToFrame(checkSettings) {
    if (!checkSettings) {
      return 0;
    }

    const frameChain = checkSettings.getFrameChain();

    let switchedToFrameCount = 0;
    for (const frameLocator of frameChain) {
      const b = await this._switchToFrameLocator(frameLocator);
      if (b) {
        switchedToFrameCount += 1;
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

    if (frameLocator.getFrameIndex()) {
      await switchTo.frame(frameLocator.getFrameIndex());
      return true;
    }

    if (frameLocator.getFrameNameOrId()) {
      await switchTo.frame(frameLocator.getFrameNameOrId());
      return true;
    }

    if (frameLocator.getFrameElement()) {
      const frameElement = frameLocator.getFrameElement();
      if (frameElement) {
        await switchTo.frame(frameElement);
        return true;
      }
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
  async addMouseTrigger(action, control, cursor) {
    if (this._configuration.getIsDisabled()) {
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
  async addMouseTriggerForElement(action, element) {
    if (this.getIsDisabled()) {
      this._logger.verbose(`Ignoring ${action} (disabled)`);
      return Promise.resolve();
    }

    // Triggers are actually performed on the previous window.
    if (!this._lastScreenshot) {
      this._logger.verbose(`Ignoring ${action} (no screenshot)`);
      return Promise.resolve();
    }

    if (!FrameChain.isSameFrameChain(this._driver.getFrameChain(), this._lastScreenshot.getFrameChain())) {
      this._logger.verbose(`Ignoring ${action} (different frame)`);
      return Promise.resolve();
    }

    ArgumentGuard.notNull(element, "element");

    const loc = await element.getLocation();
    const ds = await element.getSize();
    const elementRegion = new Region(loc.x, loc.y, ds.width, ds.height);
    EyesBase.prototype.addMouseTriggerBase.call(this, action, elementRegion, elementRegion.getMiddleOffset());
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
  async addTextTriggerForElement(element, text) {
    if (this.getIsDisabled()) {
      this._logger.verbose(`Ignoring ${text} (disabled)`);
      return Promise.resolve();
    }

    // Triggers are actually performed on the previous window.
    if (!this._lastScreenshot) {
      this._logger.verbose(`Ignoring ${text} (no screenshot)`);
      return Promise.resolve();
    }

    if (!FrameChain.isSameFrameChain(this._driver.getFrameChain(), this._lastScreenshot.getFrameChain())) {
      this._logger.verbose(`Ignoring ${text} (different frame)`);
      return Promise.resolve();
    }

    ArgumentGuard.notNull(element, "element");

    const p1 = await element.getLocation();
    const ds = await element.getSize();
    const elementRegion = new Region(Math.ceil(p1.x), Math.ceil(p1.y), ds.width, ds.height);
    EyesBase.prototype.addTextTrigger.call(this, elementRegion, text);
  }


  /**
   * Use this method only if you made a previous call to {@link #open(WebDriver, String, String)} or one of its variants.
   *
   * @override
   * @inheritDoc
   */
  async getViewportSize() {
    const viewportSize = this._viewportSizeHandler.get();
    return viewportSize ? viewportSize : this._driver.getDefaultContentViewportSize();
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Use this method only if you made a previous call to {@link #open(WebDriver, String, String)} or one of its variants.
   *
   * @protected
   * @override
   */
  async setViewportSize(viewportSize) {
    if (this._viewportSizeHandler instanceof ReadOnlyPropertyHandler) {
      this._logger.verbose('Ignored (viewport size given explicitly)');
      return Promise.resolve();
    }

    if (!EyesWDIOUtils.isMobileDevice(this._driver.remoteWebDriver)) {
      ArgumentGuard.notNull(viewportSize, 'viewportSize');
      viewportSize = new RectangleSize(viewportSize);

      const originalFrame = this._driver.getFrameChain();
      await this._driver.switchTo().defaultContent();
      try {
        await EyesWDIOUtils.setViewportSize(this._logger, this._driver, new RectangleSize(viewportSize));
        this._effectiveViewport = new Region(Location.ZERO, viewportSize);
      } catch (e) {
        await this._driver.switchTo().frames(originalFrame);
        throw new TestFailedError('Failed to set the viewport size', err);
      }

      await this._driver.switchTo().frames(originalFrame);
    }

    this._viewportSizeHandler.set(new RectangleSize(viewportSize));
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
    const elementSize = await element.getSize();
    const point = await element.getLocation();
    return new Region(point.x, point.y, elementSize.width, elementSize.height);
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

  /** @override */
  async tryCaptureDom() {
    try {
      this._logger.verbose('Getting window DOM...');
      return await DomCapture.getFullWindowDom(this._logger, this.getDriver());
    } catch (ignored) {
      return '';
    }
  }

  /**
   * @override
   */
  async getDomUrl() {
    return this._domUrl;
  }

  /**
   * @override
   */
  setDomUrl(domUrl) {
    return this._domUrl = domUrl;
  }

  /**
   * @return {boolean}
   */
  getHideCaret() {
    return this._hideCaret;
  }

  /**
   * @param {boolean} hideCaret
   */
  setHideCaret(hideCaret) {
    this._hideCaret = hideCaret;
  }

  /**
   * @private
   * @return {Promise}
   */
  async _tryHideScrollbars() {
    if (EyesWDIOUtils.isMobileDevice(this._driver.remoteWebDriver)) {
      return;
    }
    if (this._hideScrollbars || this._scrollRootElement) {
      const originalFC = new FrameChain(this._logger, this._driver.getFrameChain());
      const fc = new FrameChain(this._logger, this._driver.getFrameChain());
      const scrollRootElement = await this.getScrollRootElement();
      this._originalOverflow = await EyesWDIOUtils.hideScrollbars(this._jsExecutor, 200, scrollRootElement.element);
      await this._tryHideScrollbarsLoop(fc);
      await this._driver.switchTo().frames(originalFC);
    }

    return Promise.resolve();
  }

  /**
   * @private
   * @param {FrameChain} fc
   * @return {Promise}
   */
  async _tryHideScrollbarsLoop(fc) {
    if (this._hideScrollbars && fc.size() > 0) {
      await this.getDriver().switchTo().parentFrame();
      const frame = fc.pop();
      const scrollRootElement = await this.getScrollRootElement();
      await EyesWDIOUtils.hideScrollbars(this._jsExecutor, 200, scrollRootElement.element);
      return this._tryHideScrollbarsLoop(fc);
    }
  }

  /**
   * @private
   * @return {Promise}
   */
  async _tryRestoreScrollbars() {
    if (EyesWDIOUtils.isMobileDevice(this._driver.remoteWebDriver)) {
      return;
    }
    if (this._hideScrollbars) {
      const that = this;
      const originalFC = new FrameChain(that._logger, that._driver.getFrameChain());
      const fc = new FrameChain(that._logger, that._driver.getFrameChain());
      await that._tryRestoreScrollbarsLoop(fc);
      return that._driver.switchTo().frames(originalFC);
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
      return that.getRemoteWebDriver().switchTo().parentFrame().then(() => {
        const frame = fc.pop();
        return frame.getReference().setOverflow(frame.getOriginalOverflow());
      }).then(() => {
        return that._tryRestoreScrollbarsLoop(fc);
      });
    }

    return Promise.resolve();
  }


  /**
   *
   * @returns {Promise.<EyesWDIOScreenshot>}
   * @override
   */
  async getScreenshot() {
    this._logger.verbose("getScreenshot()");

    const scaleProviderFactory = await this._updateScalingParams();

    const originalFrameChain = new FrameChain(this._logger, this._driver.getFrameChain());
    const switchTo = this._driver.switchTo();

    const fullPageCapture = new FullPageCaptureAlgorithm(
      this._logger,
      this._regionPositionCompensation,
      this.getWaitBeforeScreenshots(),
      this._debugScreenshotsProvider,
      this._screenshotFactory,
      new ScrollPositionProvider(this._logger, this._jsExecutor),
      scaleProviderFactory,
      this._cutProviderHandler.get(),
      this.getStitchOverlap(),
      this._imageProvider
    );

    let activeElement = null;
    if (this.getHideCaret()) {
      try {
        activeElement = await this._driver.executeScript('var activeElement = document.activeElement; activeElement && activeElement.blur(); return activeElement;');
      } catch (err) {
        this._logger.verbose(`WARNING: Cannot hide caret! ${err}`);
      }
    }

    let result;
    if (this._checkFrameOrElement) {
      this._logger.verbose("Check frame/element requested");

      await switchTo.frames(originalFrameChain);

      let scrolledElement = this.getElementPositionProvider().element;
      if (!scrolledElement) {
        scrolledElement = await this._driver.findElementByTagName('html');
      }
      await this._jsExecutor.executeScript('var e = arguments[0]; if (e != null) e.setAttribute("data-applitools-scroll", "true");', scrolledElement.element);
      const entireFrameOrElement = await fullPageCapture.getStitchedRegion(this._regionToCheck, null, this.getElementPositionProvider());

      this._logger.verbose('Building screenshot object...');
      const size = new RectangleSize(entireFrameOrElement.getWidth(), entireFrameOrElement.getHeight());
      result = await EyesWDIOScreenshot.fromFrameSize(this._logger, this._driver, entireFrameOrElement, size);
    } else if (this._forceFullPageScreenshot || this._stitchContent) {
      this._logger.verbose('Full page screenshot requested.');

      // Save the current frame path.
      const originalFramePosition = originalFrameChain.size() > 0 ?
        originalFrameChain.getDefaultContentScrollPosition() : new Location(Location.ZERO);

      await switchTo.defaultContent();

      const scrollRootElement = await this.getScrollRootElement();
      await this._jsExecutor.executeScript('var e = arguments[0]; if (e != null) e.setAttribute("data-applitools-scroll", "true");', scrollRootElement.element);
      const fullPageImage = await fullPageCapture.getStitchedRegion(Region.EMPTY, null, this._positionProviderHandler.get());

      await switchTo.frames(originalFrameChain);
      result = await EyesWDIOScreenshot.fromScreenshotType(this._logger, this._driver, fullPageImage, null, originalFramePosition);
    } else {
      await this._ensureElementVisible(this._targetElement);

      this._logger.verbose('Screenshot requested...');
      let screenshotImage = await this._imageProvider.getImage();

      await this._debugScreenshotsProvider.save(screenshotImage, 'original');

      const scaleProvider = scaleProviderFactory.getScaleProvider(screenshotImage.getWidth());
      if (scaleProvider.getScaleRatio() !== 1) {
        this._logger.verbose('scaling...');
        screenshotImage = await screenshotImage.scale(scaleProvider.getScaleRatio());
        await this._debugScreenshotsProvider.save(screenshotImage, 'scaled');
      }

      const cutProvider = this._cutProviderHandler.get();
      if (!(cutProvider instanceof NullCutProvider)) {
        this._logger.verbose('cutting...');
        screenshotImage = await cutProvider.cut(screenshotImage);
        await this._debugScreenshotsProvider.save(screenshotImage, 'cut');
      }

      this._logger.verbose('Creating screenshot object...');
      result = await EyesWDIOScreenshot.fromScreenshotType(this._logger, this._driver, screenshotImage);
    }

    if (this.getHideCaret() && activeElement != null) {
      try {
        await this._driver.executeScript('arguments[0].focus();', activeElement);
      } catch (err) {
        this._logger.verbose(`WARNING: Could not return focus to active element! ${err}`);
      }
    }

    this._logger.verbose("Done!");
    return result;
  }


  /**
   * @return {Promise<Location>}
   */
  async getImageLocation() {
    if (this._targetElementLocation) {
      return this._targetElementLocation;
    }

    return Location.ZERO;
  }


  /**
   * @private
   * @param {WebElement} element
   * @return {Promise<void>}
   */
  async _ensureElementVisible(element) {
    if (!element) {
      // No element? we must be checking the window.
      return Promise.resolve();
    }

    if (EyesWDIOUtils.isMobileDevice(this._driver.remoteWebDriver)) {
      this._logger.verbose(`NATIVE context identified, skipping 'ensure element visible'`);
      return;
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
          return that.getPositionProvider().setPosition(elementLocation);
        });
      }
    });
  }


  /**
   * @private
   * @return {Promise.<FrameChain>}
   */
  _ensureFrameVisible() {
    const that = this;
    const originalFC = new FrameChain(this._logger, this._driver.getFrameChain());
    const fc = new FrameChain(this._logger, this._driver.getFrameChain());
    // noinspection JSValidateTypes
    return ensureFrameVisibleLoop(this, this.getPositionProvider(), fc, this._driver.switchTo()).then(() => {
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


  getAppEnvironment() {
    const that = this;
    let appEnv;

    return super.getAppEnvironment().then(appEnv_ => {
      appEnv = appEnv_;
      if (!appEnv._os) {
        if (that.getDriver().remoteWebDriver.isMobile) {
          let platformName = null;
          if (that.getDriver().remoteWebDriver.isAndroid) {
            that._logger.log('Android detected.');
            platformName = 'Android';
          } else if (that.getDriver().remoteWebDriver.isIOS) {
            that._logger.log('iOS detected.');
            platformName = 'iOS';
          } else {
            that._logger.log('Unknown device type.');
          }

          if (platformName) {
            let os = platformName;
            let platformVersion;
            if (that.getDriver().remoteWebDriver.capabilities) {
              platformVersion = that.getDriver().remoteWebDriver.capabilities.platformVersion;
            } else if (that.getDriver().remoteWebDriver.desiredCapabilities) {
              platformVersion = that.getDriver().remoteWebDriver.desiredCapabilities.platformVersion;
            }
            if (platformVersion) {
              os += ` ${platformVersion}`;
            }
            that._logger.verbose(`Setting OS: ${os}`);
            appEnv.setOs(os);
          }
        } else {
          that._logger.log('No mobile OS detected.');
        }
      }
    }).then(() => {
      return appEnv;
    });
  }

  // noinspection JSUnusedGlobalSymbols
  getInferredEnvironment() {
    return this._driver.getUserAgent().then(userAgent => {
      return userAgent ? "useragent:" + userAgent : userAgent;
    }).catch(() => {
      return null;
    });
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
   * @param {By} element
   */
  setScrollRootElement(element) {
    this._scrollRootElement = this._driver.findElement(element);
  }

  /**
   * @return {WebElement}
   */
  async getScrollRootElement() {
    let scrollRootElement = null;

    if (!EyesWDIOUtils.isMobileDevice(this._driver)) {
      scrollRootElement = this._scrollRootElement ? this._scrollRootElement : await this._driver.findElementByTagName('html');
    }

    return scrollRootElement;
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
  async getAUTSessionId() {
    if (!this._driver) {
      return undefined;
    }

    return this.getRemoteWebDriver().requestHandler.sessionID;
  };


  async getTitle() {
    if (!this._dontGetTitle) {
      try {
        return await this._driver.getTitle()
      } catch (e) {
        this._logger.verbose(`failed (${e})`);
        this._dontGetTitle = true;
      }

      return '';
    }

    return '';
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
   * Sets the time to wait just before taking a screenshot (e.g., to allow positioning to stabilize when performing a
   * full page stitching).
   *
   * @param {number} waitBeforeScreenshots The time to wait (Milliseconds). Values smaller or equal to 0, will cause the
   *   default value to be used.
   */
  setWaitBeforeScreenshots(waitBeforeScreenshots) {
    if (waitBeforeScreenshots <= 0) {
      this._waitBeforeScreenshots = DEFAULT_WAIT_BEFORE_SCREENSHOTS;
    } else {
      this._waitBeforeScreenshots = waitBeforeScreenshots;
    }
  }

// noinspection JSUnusedGlobalSymbols
  /**
   * @return {number} The time to wait just before taking a screenshot.
   */
  getWaitBeforeScreenshots() {
    return this._waitBeforeScreenshots;
  }


  /**
   * @return {PositionProvider} The currently set position provider.
   */
  getElementPositionProvider() {
    return this._elementPositionProvider ? this._elementPositionProvider : this.getPositionProvider();
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

    this._configuration.setStitchMode(mode);
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

  async getScreenshotUrl() {
    return undefined;
  }


  setCorsIframeHandle(corsIframeHandle) {
  }

  getCorsIframeHandle() {
    return null;
  }

  /**
   * @return {object}
   */
  getRunner() {
    const runner = {};
    /** @param  {boolean} throwEx */
    /** @return {Promise<TestResults|Error>} */
    runner.getAllResults = async (throwEx) => {
      return await this.close(throwEx);
    };
    return runner;
  }

  /**
   * @deprecated
   * @param {Configuration|object} conf
   */
  setConfiguration(conf) {
    if (!(conf instanceof Configuration)) {
      conf = new Configuration(conf);
    }

    this._configuration = conf;
  }

  /**
   * @deprecated
   * @return {Configuration}
   */
  getConfiguration() {
    return this._configuration;
  }

  setApiKey(apiKey) {
    this._configuration.setApiKey(apiKey);
  }

  getApiKey() {
    return this._configuration.getApiKey();
  }

  /**
   * @return {boolean}
   */
  getSendDom() {
    return EyesWDIOUtils.isMobileDevice(this._driver) && super.getSendDom();
  }

}

/**
 * @private
 * @param that
 * @param positionProvider
 * @param frameChain
 * @param switchTo
 * @return {Promise}
 */
async function ensureFrameVisibleLoop(that, positionProvider, frameChain, switchTo) {
  return Promise.resolve().then(() => {
    if (frameChain.size() > 0) {
      return switchTo.parentFrame().then(() => {
        const frame = frameChain.pop();

        const reg = new Region(Location.ZERO, frame.getInnerSize());
        that._effectiveViewport.intersect(reg);

        return positionProvider.setPosition(frame.getLocation());
      }).then(() => {
        return ensureFrameVisibleLoop(that, positionProvider, frameChain, switchTo);
      });
    }
  });
}

exports.EyesWDIO = EyesWDIO;
