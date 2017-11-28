'use strict';

const {
  ContextBasedScaleProviderFactory,
  DiffsFoundError,
  EyesBase,
  EyesJsExecutor,
  FailureReports,
  FixedScaleProviderFactory,
  NewTestError,
  NullScaleProvider,
  NullRegionProvider,
  ScaleProviderIdentityFactory,
  RectangleSize,
  Region,
  RegionProvider,
  TestFailedError,
  TestResultsStatus,
  UserAgent
} = require('eyes.sdk');
const {
  ArgumentGuard,
  SimplePropertyHandler
} = require('eyes.utils');

const CssTranslatePositionProvider = require('./CssTranslatePositionProvider');
const ScrollPositionProvider = require('./ScrollPositionProvider');
const EyesWebDriver = require('./EyesWebDriver');
const EyesWDIOScreenshot = require('./capture/EyesWDIOScreenshot');
const EyesWDIOUtils = require('./EyesWDIOUtils');
const StitchMode = require('./StitchMode');
const Target = require('./Target');
const WDIOJSExecutor = require('./WDIOJSExecutor');

const VERSION = require('../package.json').version;


const DEFAULT_STITCHING_OVERLAP = 50; // px
const DEFAULT_WAIT_BEFORE_SCREENSHOTS = 100; // Milliseconds
const DEFAULT_WAIT_SCROLL_STABILIZATION = 200; // Milliseconds


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
  constructor(serverUrl = EyesBase.DEFAULT_EYES_SERVER, isDisabled = false, promiseFactory) {
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
    this._checkFrameOrElement = false;
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
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   *
   * @param {Object} driver
   * @param {String} appName
   * @param {String} testName
   * @param {RectangleSize|{width: number, height: number}} viewportSize
   * @returns {Promise.<*>}
   */
  async open(driver, appName, testName, viewportSize = null, sessionType = null) {
    ArgumentGuard.notNull(driver, "driver");

    this.getPromiseFactory().setFactoryMethod(asyncAction => {
      return driver.call(() => {
        return new Promise(asyncAction);
      });
    }, null);

    this._logger.verbose("Running using Webdriverio module");

    if (this._isDisabled) {
      this._logger.verbose("Ignored");
      return this.getPromiseFactory().resolve(driver);
    }

    this._driver = new EyesWebDriver(driver, this, this._logger);

    /*
        const userAgentString = await this._driver.getUserAgent();
        if (userAgentString) {
          this._userAgent = UserAgent.parseUserAgentString(userAgentString, true);
        }

        this._imageProvider = ImageProviderFactory.getImageProvider(this._userAgent, this, this._logger, this._driver);
        this._regionPositionCompensation = RegionPositionCompensationFactory.getRegionPositionCompensation(this._userAgent, this, this._logger);
    */

    this._jsExecutor = new WDIOJSExecutor(this._driver);

    await this.openBase(appName, testName, viewportSize, sessionType);

    this._devicePixelRatio = Eyes.UNKNOWN_DEVICE_PIXEL_RATIO;

    this._initPositionProvider();

    this._driver.rotation = this._rotation;

    return this._driver;
  }


  async close(throwEx = true) {
    try {
      const results = await super.close.call(this, false);
      const status = results.getStatus();
      if (throwEx && status !== TestResultsStatus.Passed) {
        const status = results.getStatus();
        const sessionResultsUrl = results.getUrl();
        if (status === TestResultsStatus.Unresolved) {
          if (results.getIsNew()) {
            const instructions = "Please approve the new baseline at " + sessionResultsUrl;
            const message = `'${this._sessionStartInfo.getScenarioIdOrName()}' of '${this._sessionStartInfo.getAppIdOrName()}'. ${instructions}`;
            return Promise.reject(new NewTestError(results, message));
          } else {
            const instructions = `See details at ${sessionResultsUrl}`;
            const message = `Test '${this._sessionStartInfo.getScenarioIdOrName()}' of '${this._sessionStartInfo.getAppIdOrName()} detected differences!'. ${instructions}`;
            return Promise.reject(new DiffsFoundError(results, message));
          }
        } else if (status === TestResultsStatus.Failed) {
          const instructions = `See details at ${sessionResultsUrl}`;
          const message = `'${this._sessionStartInfo.getScenarioIdOrName()}' of '${this._sessionStartInfo.getAppIdOrName()}'. ${instructions}`;
          return Promise.reject(new TestFailedError(results, message));
        }
      } else {
        return Promise.resolve(results);
      }
    } catch (e) {
      console.error(e);
    }
  }


  checkWindow(tag, matchTimeout) {
    return this.check(tag, Target.window().timeout(matchTimeout));
  }


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

    try {
      const targetRegion = checkSettings.getTargetRegion();
      const targetSelector = checkSettings.targetSelector;

      if (targetRegion) {
        return super.checkWindowBase(new RegionProvider(targetRegion, this.getPromiseFactory()), name, false, checkSettings);
      } else if (targetSelector) {
        const region = await this.getRegionByLocator(targetSelector);

        return super.checkWindowBase(new RegionProvider(region, this.getPromiseFactory()), name, false, checkSettings);
      } else {
        return super.checkWindowBase(new NullRegionProvider(this.getPromiseFactory()), name, false, checkSettings);
      }
    } finally {
      this._logger.verbose("check - done!");
    }
  }


  getViewportSize() {
    return EyesWDIOUtils.getViewportSizeOrDisplaySize(this._logger, this._driver, this._promiseFactory);
  }


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
    this._logger.verbose("initializing position provider. stitchMode: " + stitchMode);
    switch (stitchMode) {
      case StitchMode.CSS:
        this.setPositionProvider(new CssTranslatePositionProvider(this._logger, this._jsExecutor, this.getPromiseFactory()));
        break;
      default:
        this.setPositionProvider(new ScrollPositionProvider(this._logger, this._jsExecutor, this.getPromiseFactory()));
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


  // noinspection JSUnusedGlobalSymbols
  /**
   *
   * @returns {Promise.<EyesWDIOScreenshot>}
   * @override
   */
  async getScreenshot() {
    const scaleProviderFactory = await this.updateScalingParams();
    const screenshot = await EyesWDIOUtils.getScreenshot(
      this._driver,
      this._viewportSize,
      this._positionProvider,
      scaleProviderFactory,
      this._cutProviderHandler.get(),
      this._forceFullPageScreenshot,
      this._hideScrollbars,
      this._stitchMode === StitchMode.CSS,
      this._imageRotationDegrees,
      this._automaticRotation,
      this._os === 'Android' ? 90 : 270,
      this._isLandscape,
      this._waitBeforeScreenshots,
      this._checkFrameOrElement,
      this._regionToCheck,
      this._saveDebugScreenshots,
      this._debugScreenshotsPath
    );

    return new EyesWDIOScreenshot(screenshot);
  };


  updateScalingParams() {
    const that = this;
    return that._promiseFactory.makePromise(function (resolve) {
      if (that._devicePixelRatio === Eyes.UNKNOWN_DEVICE_PIXEL_RATIO && that._scaleProviderHandler.get() instanceof NullScaleProvider) {
        let factory, enSize, vpSize;
        that._logger.verbose("Trying to extract device pixel ratio...");

        return EyesWDIOUtils.getDevicePixelRatio(that.jsExecutor).then(function (ratio) {
          that._devicePixelRatio = ratio;
        }, function (err) {
          that._logger.verbose("Failed to extract device pixel ratio! Using default.", err);
          that._devicePixelRatio = Eyes.DEFAULT_DEVICE_PIXEL_RATIO;
        }).then(function () {
          that._logger.verbose("Device pixel ratio: " + that._devicePixelRatio);
          that._logger.verbose("Setting scale provider..");
          return that._positionProvider.getEntireSize();
        }).then(function (entireSize) {
          enSize = new RectangleSize(entireSize.getWidth(), entireSize.getHeight());
          return that.getViewportSize();
        }).then(function (viewportSize) {
          vpSize = new RectangleSize(viewportSize.width, viewportSize.height);
          factory = new ContextBasedScaleProviderFactory(that._logger, enSize, vpSize, that._devicePixelRatio, that._driver.remoteWebDriver.isMobile, that._scaleProviderHandler);
        }, function (err) {
          // This can happen in Appium for example.
          that._logger.verbose("Failed to set ContextBasedScaleProvider.", err);
          that._logger.verbose("Using FixedScaleProvider instead...");
          factory = new FixedScaleProviderFactory(1 / that._devicePixelRatio, that._scaleProviderHandler);
        }).then(function () {
          that._logger.verbose("Done!");
          resolve(factory);
        });
      }

      // If we already have a scale provider set, we'll just use it, and pass a mock as provider handler.
      resolve(new ScaleProviderIdentityFactory(that._scaleProviderHandler.get(), new SimplePropertyHandler()));
    });
  };


  // noinspection JSUnusedGlobalSymbols
  setViewportSize(size) {
    this._viewportSize = size;
    return EyesWDIOUtils.setViewportSize(this._logger, this._driver, size);
  };


  // noinspection JSUnusedGlobalSymbols
  async getInferredEnvironment() {
    const res = 'useragent:';
    try {
      const userAgent = await this.jsExecutor.executeScript('return navigator.userAgent');
      return res + userAgent.value;
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
  getAUTSessionId() {
    if (!this._driver) {
      return undefined;
    }

    return Promise.resolve(this._driver.remoteWebDriver.requestHandler.sessionID);
  };


  getTitle() {
    return this._driver.getTitle();
  };


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


}

module.exports = Eyes;
