'use strict';

const {
  CheckSettings,
  ContextBasedScaleProviderFactory,
  CoordinatesType,
  DiffsFoundError,
  EyesBase,
  FixedScaleProviderFactory,
  NewTestError,
  NullScaleProvider,
  NullRegionProvider,
  PromiseFactory,
  ScaleProviderIdentityFactory,
  RectangleSize,
  Region,
  RegionProvider,
  TestFailedError,
  TestResultsStatus
} = require('eyes.sdk');
const {
  ArgumentGuard,
  GeometryUtils,
  SimplePropertyHandler
} = require('eyes.utils');


const CssTranslatePositionProvider = require('./CssTranslatePositionProvider');
const ElementFinderWrapper = require('./ElementFinderWrappers').ElementFinderWrapper;
const ScrollPositionProvider = require('./ScrollPositionProvider');
const EyesRegionProvider = require('./EyesRegionProvider');
const EyesWebDriver = require('./EyesWebDriver');
const EyesWDIOScreenshot = require('./EyesWDIOScreenshot');
const EyesWDIOUtils = require('./EyesWDIOUtils');
const Target = require('./Target');
const WebdriverioCheckSettings = require('./WebdriverioCheckSettings');

const VERSION = require('../package.json').version;


class Eyes extends EyesBase {

  static get UNKNOWN_DEVICE_PIXEL_RATIO() {
    return 0;
  }

  static get DEFAULT_DEVICE_PIXEL_RATIO() {
    return 1;
  }

  constructor(serverUrl) {
    let promiseFactory = new PromiseFactory((asyncAction) => {
      return new Promise(asyncAction);
    }, null);

    super(promiseFactory, serverUrl || EyesBase.DEFAULT_EYES_SERVER);

    this._forceFullPage = false;
    this._imageRotationDegrees = 0;
    this._automaticRotation = true;
    this._isLandscape = false;
    this._hideScrollbars = null;
    this._checkFrameOrElement = false;

    // this._promiseFactory = promiseFactory;
  }


  _init(driver) {
    this._promiseFactory.setFactoryMethods(asyncAction => {
      return driver.call(() => {
        return new Promise(asyncAction);
      });
    }, null);
  }


  async open(driver, appName, testName, viewportSize) {
    this._init(driver);


    this._isProtractorLoaded = false;
    this._logger.verbose("Running using Webdriverio module");

    this._devicePixelRatio = Eyes.UNKNOWN_DEVICE_PIXEL_RATIO;
    // that._driver = driver;
    this._driver = new EyesWebDriver(driver, this, this._logger, this._promiseFactory);
    this.setStitchMode(this._stitchMode);

    if (this._isDisabled) {
      return driver.execute(function () {
        return driver;
      });
    }

    if (driver.isMobile) {
      let status = await driver.status();
      const platformVersion = status.value.os.version;

      let majorVersion;
      if (!platformVersion || platformVersion.length < 1) {
        return;
      }
      majorVersion = platformVersion.split('.', 2)[0];
      let isAndroid = driver.isAndroid;
      let isIOS = driver.isIOS;
      if (isAndroid) {
        if (!this.getHostOS()) {
          this.setHostOS('Android ' + majorVersion);
        }
      } else if (isIOS) {
        if (!this.getHostOS()) {
          this.setHostOS('iOS ' + majorVersion);
        }
      }

      const orientation = driver.getOrientation();
      if (orientation && orientation.toUpperCase() === 'LANDSCAPE') {
        this._isLandscape = true;
      }
    }

    return this.openBase(appName, testName, viewportSize, null);
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
   * @param {String} selector
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
   * @param {string} selector
   * @returns {Region}
   */
  async getRegionByLocator(selector) {
    const element = await this._driver.findElement(selector);

    let elementSize = await element.getSize();
    let point = await element.getLocation();

    return new Region(point.x, point.y, elementSize.width, elementSize.height);
  };


  setStitchMode(mode) {
    this._stitchMode = mode;
    if (this._driver) {
      switch (mode) {
        case Eyes.StitchMode.CSS:
          this.setPositionProvider(new CssTranslatePositionProvider(this._logger, this._driver, this._promiseFactory));
          break;
        default:
          this.setPositionProvider(new ScrollPositionProvider(this._logger, this._driver, this._promiseFactory));
      }
    }
  };

  /**
   * Get the stitch mode.
   * @return {StitchMode} The currently set StitchMode.
   */
  getStitchMode() {
    return this._stitchMode;
  };


  async getScreenshot() {
    const scaleProviderFactory = await this.updateScalingParams();
    const screenshot = await EyesWDIOUtils.getScreenshot(
      this._driver,
      this._promiseFactory,
      this._viewportSize,
      this._positionProvider,
      scaleProviderFactory,
      this._cutProviderHandler.get(),
      this._forceFullPage,
      this._hideScrollbars,
      this._stitchMode === Eyes.StitchMode.CSS,
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

  static get StitchMode() {
    return {
      // Uses scrolling to get to the different parts of the page.
      Scroll: 'Scroll',

      // Uses CSS transitions to get to the different parts of the page.
      CSS: 'CSS'
    };
  }


  updateScalingParams() {
    const that = this;
    return that._promiseFactory.makePromise(function (resolve) {
      if (that._devicePixelRatio === Eyes.UNKNOWN_DEVICE_PIXEL_RATIO && that._scaleProviderHandler.get() instanceof NullScaleProvider) {
        let factory, enSize, vpSize;
        that._logger.verbose("Trying to extract device pixel ratio...");

        return EyesWDIOUtils.getDevicePixelRatio(that._driver, that._promiseFactory).then(function (ratio) {
          that._devicePixelRatio = ratio;
        }, function (err) {
          that._logger.verbose("Failed to extract device pixel ratio! Using default.", err);
          that._devicePixelRatio = Eyes.DEFAULT_DEVICE_PIXEL_RATIO;
        }).then(function () {
          that._logger.verbose("Device pixel ratio: " + that._devicePixelRatio);
          that._logger.verbose("Setting scale provider..");
          return that._positionProvider.getEntireSize();
        }).then(function (entireSize) {
          enSize = new RectangleSize(entireSize.width, entireSize.height);
          return that.getViewportSize();
        }).then(function (viewportSize) {
          vpSize = new RectangleSize(viewportSize.width, viewportSize.height);
          factory = new ContextBasedScaleProviderFactory(that._logger, enSize, vpSize, that._devicePixelRatio, that._driver.getRemoteWebDriver().isMobile, that._scaleProviderHandler);
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


  setViewportSize(size) {
    this._viewportSize = new RectangleSize(size.getWidth(), size.getHeight());
    return EyesWDIOUtils.setViewportSize(this._logger, this._driver, size, this._promiseFactory);
  };


  getInferredEnvironment() {
    let res = 'useragent:';
    return this._driver.execute('return navigator.userAgent').then(function (userAgent) {
      return res + userAgent;
    }, function () {
      return res;
    });
  };


  getBaseAgentId() {
    return `eyes.webdriverio/${VERSION}`;
  };


  setFailureReport(mode) {
    if (mode === EyesBase.FailureReport.Immediate) {
      this._failureReportOverridden = true;
      mode = EyesBase.FailureReport.OnClose;
    }

    EyesBase.prototype.setFailureReport.call(this, mode);
  };


  getAUTSessionId() {
    if (!this._driver) {
      return undefined;
    }

    return Promise.resolve(this._driver.getRemoteWebDriver().requestHandler.sessionID);
  };


  _waitTimeout(ms) {
    return this._driver.timeouts(ms);
  };


  getTitle() {
    return this._driver.getTitle();
  };


}

module.exports = Eyes;
