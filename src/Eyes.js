(function () {

  const EyesSDK = require('eyes.sdk');
  const EyesUtils = require('eyes.utils');
  const EyesBase = EyesSDK.EyesBase;
  const NullScaleProvider = EyesSDK.NullScaleProvider;
  const ContextBasedScaleProviderFactory = EyesSDK.ContextBasedScaleProviderFactory;
  const FixedScaleProviderFactory = EyesSDK.FixedScaleProviderFactory;
  const ScaleProviderIdentityFactory = EyesSDK.ScaleProviderIdentityFactory;
  const SimplePropertyHandler = EyesUtils.SimplePropertyHandler;
  const PromiseFactory = EyesUtils.PromiseFactory;
  const ArgumentGuard = EyesUtils.ArgumentGuard;
  const EyesWDIOUtils = require('./EyesWDIOUtils');
  const Target = require('./Target');
  const EyesRemoteWebElement = require('./EyesRemoteWebElement');
  const ElementFinderWrapper = require('./ElementFinderWrappers').ElementFinderWrapper;
  const ScrollPositionProvider = require('./ScrollPositionProvider');
  const CssTranslatePositionProvider = require('./CssTranslatePositionProvider');
  const GeometryUtils = EyesUtils.GeometryUtils;

  const UNKNOWN_DEVICE_PIXEL_RATIO = 0;
  const DEFAULT_DEVICE_PIXEL_RATIO = 1;


  function Eyes(serverUrl) {
    this._forceFullPage = false;
    this._imageRotationDegrees = 0;
    this._automaticRotation = true;
    this._isLandscape = false;
    this._hideScrollbars = null;
    this._checkFrameOrElement = false;

    this._promiseFactory = new PromiseFactory();

    EyesBase.call(this, this._promiseFactory, serverUrl || EyesBase.DEFAULT_EYES_SERVER, false);
  }

  Eyes.prototype = new EyesBase();
  Eyes.prototype.constructor = Eyes;


  function _init(that, driver) {
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


  Eyes.prototype.open = function* (driver, appName, testName, viewportSize) {
    let that = this;

    _init(that, driver);

    that._isProtractorLoaded = false;
    that._logger.verbose("Running using Webdriverio module");

    that._devicePixelRatio = UNKNOWN_DEVICE_PIXEL_RATIO;
    that._driver = driver;
    that.setStitchMode(that._stitchMode);

    if (this._isDisabled) {
      return driver.execute(function () {
        return driver;
      });
    }

    return driver.call(function () {
      return driver.status().then((status) => {
        const platformVersion = status.value.os.version;

        let majorVersion;
        if (!platformVersion || platformVersion.length < 1) {
          return;
        }
        majorVersion = platformVersion.split('.', 2)[0];
        if (driver.isAndroid) {
          if (!that.getHostOS()) {
            that.setHostOS('Android ' + majorVersion);
          }
        } else if (driver.isIOS) {
          if (!that.getHostOS()) {
            that.setHostOS('iOS ' + majorVersion);
          }
        } else {
          return;
        }

        const orientation = driver.getOrientation();
        if (orientation && orientation.toUpperCase() === 'LANDSCAPE') {
          that._isLandscape = true;
        }
      }).then(function () {
        return EyesBase.prototype.open.call(that, appName, testName, viewportSize);
      }).then(function () {
        return that._driver;
      });
    });
  };


  Eyes.prototype.close = function (throwEx) {
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
  };


  Eyes.prototype.checkWindow1 = function* (name) {
    const that = this;

    /*
        const imageMatchSettings = {
          matchLevel: target.getMatchLevel(),
          ignoreCaret: target.getIgnoreCaret(),
          ignore: target.getIgnoreRegions(),
          floating: target.getFloatingRegions(),
          exact: null
        };
    */
    let result = yield EyesBase.prototype.checkWindow.call(that, name, false, null, null, null);

    if (result.asExpected) {
      return result;
    } else {
      throw EyesBase.buildTestError(result, that._sessionStartInfo.scenarioIdOrName, that._sessionStartInfo.appIdOrName);
    }
  };


  Eyes.prototype.checkWindow = function (tag, matchTimeout) {
    return this.check(tag, Target.window().timeout(matchTimeout));
  };


  Eyes.prototype.check = function (name, target) {
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

    if (target.getIgnoreObjects().length) {
      target.getIgnoreObjects().forEach(function (obj) {
        promise = promise.then(function () {
          return findElementByLocator(that, obj.element);
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

    if (target.getFloatingObjects().length) {
      target.getFloatingObjects().forEach(function (obj) {
        promise = promise.then(function () {
          return findElementByLocator(that, obj.element);
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

    // If frame specified
    if (target.isUsingFrame()) {
      promise = promise.then(function () {
        return findElementByLocator(that, target.getFrame());
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

    // if region specified
    if (target.isUsingRegion()) {
      promise = promise.then(function () {
        return findElementByLocator(that, target.getRegion());
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
    }

    return promise.then(function () {
      that._logger.verbose("Call to checkWindowBase...");
      const imageMatchSettings = {
        matchLevel: target.getMatchLevel(),
        ignoreCaret: target.getIgnoreCaret(),
        ignore: target.getIgnoreRegions(),
        floating: target.getFloatingRegions(),
        exact: null
      };
      return EyesBase.prototype.checkWindow.call(that, name, target.getIgnoreMismatch(), target.getTimeout(), regionProvider, imageMatchSettings);
    }).then(function (result) {
      that._logger.verbose("Processing results...");
      if (result.asExpected || !that._failureReportOverridden) {
        return result;
      } else {
        throw EyesBase.buildTestError(result, that._sessionStartInfo.scenarioIdOrName, that._sessionStartInfo.appIdOrName);
      }
    }).then(function () {
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
    }).then(function () {
      that._logger.verbose("Done!");

      // restore parent frame, if another frame was selected
      if (isFrameSwitched) {
        throw new Error('Frame support is not implemented yet!');
        that._logger.verbose("Switching back to parent frame...");
        return that._driver.switchTo().parentFrame().then(function () {
          that._logger.verbose("Done!");
        });
      }
    });
  };


  const findElementByLocator = function (that, elementObject) {
    return that._promiseFactory.makePromise(function (resolve) {
      if (isLocatorObject(elementObject)) {
        that._logger.verbose("Trying to find element...", elementObject);
        return resolve(that._driver.findElement(elementObject));
      } else if (elementObject instanceof ElementFinderWrapper) {
        return resolve(elementObject.getWebElement());
      }

      resolve(elementObject);
    });
  };

  const isElementObject = function (o) {
    return o instanceof EyesRemoteWebElement;
  };

  const isLocatorObject = function (o) {
    return o instanceof webdriver.By || o.findElementsOverride !== undefined || (o.using !== undefined && o.value !== undefined);
  };


  Eyes.prototype.getViewportSize = function () {
    return EyesWDIOUtils.getViewportSizeOrDisplaySize(this._logger, this._driver, this._promiseFactory);
  };


  const getRegionFromWebElement = function (element) {
    let elementSize;
    return element.getSize().then(function (size) {
      elementSize = size;
      return element.getLocation();
    }).then(function (point) {
      return GeometryUtils.createRegionFromLocationAndSize(point, elementSize);
    });
  };


  Eyes.prototype.setStitchMode = function (mode) {
    this._stitchMode = mode;
    if (this._driver) {
      switch (mode) {
        case StitchMode.CSS:
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
  Eyes.prototype.getStitchMode = function () {
    return this._stitchMode;
  };


  Eyes.prototype.getScreenShot = function () {
    const that = this;
    return that.updateScalingParams().then(function (scaleProviderFactory) {
      return EyesWDIOUtils.getScreenshot(
        that._driver,
        that._promiseFactory,
        that._viewportSize,
        that._positionProvider,
        scaleProviderFactory,
        that._cutProviderHandler.get(),
        that._forceFullPage,
        that._hideScrollbars,
        that._stitchMode === StitchMode.CSS,
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
    });
  };

  const StitchMode = {
    // Uses scrolling to get to the different parts of the page.
    Scroll: 'Scroll',

    // Uses CSS transitions to get to the different parts of the page.
    CSS: 'CSS'
  };


  Eyes.prototype.updateScalingParams = function () {
    const that = this;
    return that._promiseFactory.makePromise(function (resolve) {
      if (that._devicePixelRatio === UNKNOWN_DEVICE_PIXEL_RATIO && that._scaleProviderHandler.get() instanceof NullScaleProvider) {
        let factory, enSize, vpSize;
        that._logger.verbose("Trying to extract device pixel ratio...");

        return EyesWDIOUtils.getDevicePixelRatio(that._driver, that._promiseFactory).then(function (ratio) {
          that._devicePixelRatio = ratio;
        }, function (err) {
          that._logger.verbose("Failed to extract device pixel ratio! Using default.", err);
          that._devicePixelRatio = DEFAULT_DEVICE_PIXEL_RATIO;
        }).then(function () {
          that._logger.verbose("Device pixel ratio: " + that._devicePixelRatio);
          that._logger.verbose("Setting scale provider..");
          return that._positionProvider.getEntireSize();
        }).then(function (entireSize) {
          enSize = entireSize;
          return that.getViewportSize();
        }).then(function (viewportSize) {
          vpSize = viewportSize;
          factory = new ContextBasedScaleProviderFactory(enSize, vpSize, that._devicePixelRatio, that._scaleProviderHandler);
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


  Eyes.prototype.setViewportSize = function (size) {
    return EyesWDIOUtils.setViewportSize(this._logger, this._driver, size, this._promiseFactory);
  };


  Eyes.prototype.getInferredEnvironment = function () {
    let res = 'useragent:';
    return this._driver.execute('return navigator.userAgent').then(function (userAgent) {
      return res + userAgent;
    }, function () {
      return res;
    });
  };


  Eyes.prototype._getBaseAgentId = function () {
    return 'webdriverio/4.8.0';
  };


  Eyes.prototype.setFailureReport = function (mode) {
    if (mode === EyesBase.FailureReport.Immediate) {
      this._failureReportOverridden = true;
      mode = EyesBase.FailureReport.OnClose;
    }

    EyesBase.prototype.setFailureReport.call(this, mode);
  };


  Eyes.prototype.getAUTSessionId = function () {
    if (!this._driver) {
      return undefined;
    }

    return Promise.resolve(this._driver.requestHandler.sessionID);
  };


  Eyes.prototype._waitTimeout = function (ms) {
    return this._driver.timeouts(ms);
  };


  Eyes.prototype.getTitle = function () {
    return this._driver.getTitle();
  };


  module.exports = Eyes;

}());
