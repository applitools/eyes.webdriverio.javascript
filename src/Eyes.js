'use strict';
// import {EyesBase, ContextBasedScaleProviderFactory, FixedScaleProviderFactory, ScaleProviderIdentityFactory} from 'eyes.sdk';

const EyesSDK = require('eyes.sdk');
const EyesUtils = require('eyes.utils');
const EyesBase = EyesSDK.EyesBase;
const NullScaleProvider = EyesSDK.NullScaleProvider;
const ContextBasedScaleProviderFactory = EyesSDK.ContextBasedScaleProviderFactory;
const FixedScaleProviderFactory = EyesSDK.FixedScaleProviderFactory;
const ScaleProviderIdentityFactory = EyesSDK.ScaleProviderIdentityFactory;
const RegionProvider = EyesSDK.RegionProvider;
const NullRegionProvider = EyesSDK.NullRegionProvider;
const SimplePropertyHandler = EyesUtils.SimplePropertyHandler;
const PromiseFactory = EyesSDK.PromiseFactory;
const CheckSettings = EyesSDK.CheckSettings;
const RectangleSize = EyesSDK.RectangleSize;
const ArgumentGuard = EyesUtils.ArgumentGuard;
const CssTranslatePositionProvider = require('./CssTranslatePositionProvider');
const EyesWDIOUtils = require('./EyesWDIOUtils');
const EyesWDIOScreenshot = require('./EyesWDIOScreenshot');
const EyesWebDriver = require('./EyesWebDriver');
const EyesRemoteWebElement = require('./EyesRemoteWebElement');
const ElementFinderWrapper = require('./ElementFinderWrappers').ElementFinderWrapper;
const ScrollPositionProvider = require('./ScrollPositionProvider');
const Target = require('./Target');
const GeometryUtils = EyesUtils.GeometryUtils;


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


  static _init(that, driver) {
    that._promiseFactory.setFactoryMethods(function (asyncAction) {
      return driver.call(function () {
        let deferred = Promise.defer();
        asyncAction(deferred.resolve, deferred.reject);
        return deferred.promise;
      });
    }, function () {
      return Promise.defer();
    });
  }


  * open(driver, appName, testName, viewportSize) {
    let that = this;

    Eyes._init(that, driver);


    that._isProtractorLoaded = false;
    that._logger.verbose("Running using Webdriverio module");

    that._devicePixelRatio = Eyes.UNKNOWN_DEVICE_PIXEL_RATIO;
    // that._driver = driver;
    that._driver = new EyesWebDriver(driver, that, that._logger, that._promiseFactory);
    that.setStitchMode(that._stitchMode);

    if (this._isDisabled) {
      return driver.execute(function () {
        return driver;
      });
    }

    if (driver.isMobile) {
      let status = yield driver.status();
      const platformVersion = status.value.os.version;

      let majorVersion;
      if (!platformVersion || platformVersion.length < 1) {
        return;
      }
      majorVersion = platformVersion.split('.', 2)[0];
      let isAndroid = driver.isAndroid;
      let isIOS = driver.isIOS;
      if (isAndroid) {
        if (!that.getHostOS()) {
          that.setHostOS('Android ' + majorVersion);
        }
      } else if (isIOS) {
        if (!that.getHostOS()) {
          that.setHostOS('iOS ' + majorVersion);
        }
      }

      const orientation = driver.getOrientation();
      if (orientation && orientation.toUpperCase() === 'LANDSCAPE') {
        that._isLandscape = true;
      }
    }

    return super.openBase(appName, testName, viewportSize, null);
  }


  close(throwEx) {
    let that = this;

    if (throwEx === undefined) {
      throwEx = true;
    }

    return that._driver.call(function () {
      return EyesBase.prototype.close.call(that, throwEx)
        .then(function (results) {
          return results;
        }, function (err) {
          throw err;
        });
    });
  }


  checkWindow(tag, matchTimeout) {
    return this.check(tag, Target.window().timeout(matchTimeout));
  };


  checkElement(element, matchTimeout, tag) {
    return this.check(tag, Target.region(element).timeout(matchTimeout));
  };


  * check(name, target) {
    ArgumentGuard.notNullOrEmpty(name, "Name");
    ArgumentGuard.notNull(target, "Target");

    const that = this;

    let promise = that._promiseFactory.makePromise(function (resolve) {
      resolve();
    });

    if (that._isDisabled) {
      that._logger.verbose("match ignored - ", name);
      return promise;
    }

    // todo
    if (target.getIgnoreObjects().length) {
      target.getIgnoreObjects().forEach(function (obj) {
        promise = promise.then(function () {
          return Eyes.findElementByLocator(that, obj.element);
        }).then(function (element) {
          if (!isElementObject(element)) {
            throw new Error("Unsupported ignore region type: " + typeof element);
          }

          return getRegionFromWebElement(element);
        }).then(function (region) {
          target.ignore(region);
        });
      });
    }

    // todo
    if (target.getFloatingObjects().length) {
      target.getFloatingObjects().forEach(function (obj) {
        promise = promise.then(function () {
          return Eyes.findElementByLocator(that, obj.element);
        }).then(function (element) {
          if (!isElementObject(element)) {
            throw new Error("Unsupported floating region type: " + typeof element);
          }

          return getRegionFromWebElement(element);
        }).then(function (region) {
          region.maxLeftOffset = obj.maxLeftOffset;
          region.maxRightOffset = obj.maxRightOffset;
          region.maxUpOffset = obj.maxUpOffset;
          region.maxDownOffset = obj.maxDownOffset;
          target.floating(region);
        });
      });
    }

    that._logger.verbose("match starting with params", name, target.getStitchContent(), target.getTimeout());
    let regionObject,
      regionProvider,
      isFrameSwitched = false, // if we will switch frame then we need to restore parent
      originalForceFullPage, originalOverflow, originalPositionProvider, originalHideScrollBars;

    if (target.getStitchContent()) {
      originalForceFullPage = that._forceFullPage;
      that._forceFullPage = true;
    }

    // todo
    // If frame specified
    if (target.isUsingFrame()) {
      promise = promise.then(function () {
        return Eyes.findElementByLocator(that, target.getFrame());
      }).then(function (frame) {
        that._logger.verbose("Switching to frame...");
        return that._driver.switchTo().frame(frame);
      }).then(function () {
        isFrameSwitched = true;
        that._logger.verbose("Done!");

        // if we need to check entire frame, we need to update region provider
        if (!target.isUsingRegion()) {
          that._checkFrameOrElement = true;
          originalHideScrollBars = that._hideScrollbars;
          that._hideScrollbars = true;
          return getRegionProviderForCurrentFrame(that).then(function (regionProvider) {
            that._regionToCheck = regionProvider;
          });
        }
      });
    }

    // todo
    // if region specified
    if (target.isUsingRegion()) {
      promise = promise.then(function () {
        return Eyes.findElementByLocator(that, target.getRegion());
      }).then(function (region) {
        regionObject = region;

        if (isElementObject(regionObject)) {
          let regionPromise;
          if (target.getStitchContent()) {
            that._checkFrameOrElement = true;

            originalPositionProvider = that.getPositionProvider();
            that.setPositionProvider(new ElementPositionProvider(that._logger, that._driver, regionObject, that._promiseFactory));

            // Set overflow to "hidden".
            regionPromise = regionObject.getOverflow().then(function (value) {
              originalOverflow = value;
              return regionObject.setOverflow("hidden");
            }).then(function () {
              return getRegionProviderForElement(that, regionObject);
            }).then(function (regionProvider) {
              that._regionToCheck = regionProvider;
            });
          } else {
            regionPromise = getRegionFromWebElement(regionObject);
          }

          return regionPromise.then(function (region) {
            regionProvider = new EyesRegionProvider(that._logger, that._driver, region, CoordinatesType.CONTEXT_RELATIVE);
          });
        } else if (GeometryUtils.isRegion(regionObject)) {
          // if regionObject is simple region
          regionProvider = new EyesRegionProvider(that._logger, that._driver, regionObject, CoordinatesType.CONTEXT_AS_IS);
        } else {
          throw new Error("Unsupported region type: " + typeof regionObject);
        }
      });
    } else {
      regionProvider = new NullRegionProvider();
    }

    that._logger.verbose("Call to checkWindowBase...");
    const imageMatchSettings = {
      matchLevel: target.getMatchLevel(),
      ignoreCaret: target.getIgnoreCaret(),
      ignore: target.getIgnoreRegions(),
      floating: target.getFloatingRegions(),
      exact: null
    };

    let result = yield super.checkWindowBase(regionProvider, name, target.getIgnoreMismatch(), new CheckSettings(target.getTimeout()));

    that._logger.verbose("Processing results...");
    if (result.asExpected || !that._failureReportOverridden) {
      return result;
    } else {
      throw EyesBase.buildTestError(result, that._sessionStartInfo.scenarioIdOrName, that._sessionStartInfo.appIdOrName);
    }

    that._logger.verbose("Done!");
    that._logger.verbose("Restoring temporal variables...");

    if (that._regionToCheck) {
      that._regionToCheck = null;
    }

    if (that._checkFrameOrElement) {
      that._checkFrameOrElement = false;
    }

    // restore initial values
    if (originalForceFullPage !== undefined) {
      that._forceFullPage = originalForceFullPage;
    }

    if (originalHideScrollBars !== undefined) {
      that._hideScrollbars = originalHideScrollBars;
    }

    if (originalPositionProvider !== undefined) {
      that.setPositionProvider(originalPositionProvider);
    }

    if (originalOverflow !== undefined) {
      return regionObject.setOverflow(originalOverflow);
    }

    that._logger.verbose("Done!");

    // restore parent frame, if another frame was selected
    if (isFrameSwitched) {
      throw new Error('Frame support is not implemented yet!');
      that._logger.verbose("Switching back to parent frame...");
      return that._driver.switchTo().parentFrame().then(function () {
        that._logger.verbose("Done!");
      });
    }
  }


  static findElementByLocator(that, elementObject) {
    return that._promiseFactory.makePromise(function (resolve) {
      return resolve(that._driver.findElement(elementObject));
    });
  };

  static isElementObject(o) {
    return o instanceof EyesRemoteWebElement;
  };

  static isLocatorObject(o) {
    return o instanceof webdriver.By || o.findElementsOverride !== undefined || (o.using !== undefined && o.value !== undefined);
  };


  getViewportSize() {
    return EyesWDIOUtils.getViewportSizeOrDisplaySize(this._logger, this._driver, this._promiseFactory);
  };


  static getRegionFromWebElement(element) {
    let elementSize;
    return element.getSize().then(function (size) {
      elementSize = size;
      return element.getLocation();
    }).then(function (point) {
      return GeometryUtils.createRegionFromLocationAndSize(point, elementSize);
    });
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


  getScreenshot() {
    const that = this;
    return that.updateScalingParams().then(scaleProviderFactory => {
      return EyesWDIOUtils.getScreenshot(
        that._driver,
        that._promiseFactory,
        that._viewportSize,
        that._positionProvider,
        scaleProviderFactory,
        that._cutProviderHandler.get(),
        that._forceFullPage,
        that._hideScrollbars,
        that._stitchMode === Eyes.StitchMode.CSS,
        that._imageRotationDegrees,
        that._automaticRotation,
        that._os === 'Android' ? 90 : 270,
        that._isLandscape,
        that._waitBeforeScreenshots,
        that._checkFrameOrElement,
        that._regionToCheck,
        that._saveDebugScreenshots,
        that._debugScreenshotsPath
      );
    }).then(screenshot => {
      return new EyesWDIOScreenshot(screenshot);
    });
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
    this._viewportSize = new RectangleSize(size.width, size.height);
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
    return 'webdriverio/4.8.0';
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
