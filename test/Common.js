'use strict';

const {AssertionError, deepEqual} = require('assert');
const webdriverio = require('webdriverio');
const chromedriver = require('chromedriver');
const geckodriver = require('geckodriver');
const {Eyes, NetHelper, StitchMode} = require('../index');
const {BatchInfo, ConsoleLogHandler, FloatingMatchSettings, metadata, RectangleSize, Region} = require('@applitools/eyes.sdk.core');
const {ActualAppOutput, ImageMatchSettings, SessionResults} = metadata;
const url = require('url');

let batchInfo = new BatchInfo('Java3 Tests');

class Common {

  static get CHROME() {
    return {
      desiredCapabilities: {
        browserName: 'chrome',
        chromeOptions: {
          args: [
            'disable-infobars',
            'headless'
          ]
        }
      }
    }
  };

  static get FIREFOX() {
    return {
      desiredCapabilities: {
        browserName: 'firefox',
        "moz:firefoxOptions": {
          // flag to activate Firefox headless mode (see https://github.com/mozilla/geckodriver/blob/master/README.md#firefox-capabilities for more details about moz:firefoxOptions)
          args: ['-headless']
        }
      }
    }
  };

  static get SAFARI() {
    return {
      desiredCapabilities: {
        browserName: 'safari'
      }
    }
  };

  /**
   *
   * @param {Object} options
   */
  constructor({testedPageUrl, browserName}) {
    this._eyes = null;
    this._browser = null;
    this._browserName = browserName;
    this._testedPageUrl = testedPageUrl;
    this._forceFullPageScreenshot = false;
    this._seleniumStandAloneMode = Common.getSeleniumStandAloneMode();
  }

  beforeTest({batchName: batchName, fps = false, stitchMode = StitchMode.CSS}) {
    this._eyes = new Eyes();
    this._eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    this._eyes.setLogHandler(new ConsoleLogHandler(true));

    this._eyes.setForceFullPageScreenshot(fps);
    this._eyes.setStitchMode(stitchMode);
    this._eyes.setHideScrollbars(true);


    if (batchName) {
      batchInfo = new BatchInfo(batchName);
    }
    const batchId = process.env.APPLITOOLS_BATCH_ID;
    if (batchId != null) {
      batchInfo.setId(batchId);
    }
    this._eyes.setBatch(batchInfo);

    // this._eyes.setSaveDebugScreenshots(true);

    if (!this._seleniumStandAloneMode && !(process.env.SELENIUM_SERVER_URL === 'http://ondemand.saucelabs.com/wd/hub'
        && process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY)) {
      if (this._browserName === 'chrome') {
        chromedriver.start();
      } else if (this._browserName === 'firefox') {
        geckodriver.start();
      }
    }
  }

  beforeEachTest({
                   appName,
                   testName,
                   browserOptions: browserOptions,
                   rectangleSize = {
                     width: 800,
                     height: 600
                   }, testedPageUrl = this._testedPageUrl,
                   platform = Common.getDefaultPlatform()
                 }) {

    if (process.env.SELENIUM_SERVER_URL === 'http://ondemand.saucelabs.com/wd/hub'
      && process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY) {

      const seleniumServerUrl = url.parse(process.env.SELENIUM_SERVER_URL);
      browserOptions.host = seleniumServerUrl.hostname;

      browserOptions.port = '80';
      browserOptions.path = '/wd/hub';

      browserOptions.desiredCapabilities.baseUrl = `http://${process.env.SAUCE_USERNAME}:${process.env.SAUCE_ACCESS_KEY}@ondemand.saucelabs.com:80/wd/hub`;
      browserOptions.desiredCapabilities.username = process.env.SAUCE_USERNAME;
      browserOptions.desiredCapabilities.accesskey = process.env.SAUCE_ACCESS_KEY;
      browserOptions.desiredCapabilities.platform = platform;
    } else if (!this._seleniumStandAloneMode) {
      if (browserOptions.desiredCapabilities.browserName === 'chrome') {
        browserOptions.port = '9515';
        browserOptions.path = '/';
      } else if (browserOptions.desiredCapabilities.browserName === 'firefox') {
        browserOptions.path = '/';
      }
    }

    const that = this;
    this._browser = webdriverio.remote(browserOptions);
    return this._browser.init().then(() => {
      const viewportSize = rectangleSize ? new RectangleSize(rectangleSize) : null;

      testName += `_${platform}`;
      if (that._eyes.getForceFullPageScreenshot()) {
        testName += '_FPS';
      }

      return this._eyes.open(this._browser, appName, testName, viewportSize);
    }).url(testedPageUrl).then(() => {
      that._expectedFloatingsRegions = null;
    });
  }

  afterEachTest() {
    let error;
    const that = this;
    return this._eyes.close(false).then(results => {

      const query = `?format=json&AccessToken=${results.getSecretToken()}&apiKey=${that.eyes.getApiKey()}`;
      const apiSessionUrl = results.getApiUrls().getSession() + query;

      const apiSessionUri = url.parse(apiSessionUrl);
      // apiSessionUri.searchParams.append('format', 'json');
      // apiSessionUri.searchParams.append('AccessToken', results.getSecretToken());
      // apiSessionUri.searchParams.append('apiKey', this.eyes.getApiKey());

      return NetHelper.get(apiSessionUri).then(res => {
        const resultObject = JSON.parse(res);
        /** @type {SessionResults} */
        const sessionResults = SessionResults.fromObject(resultObject);
        /** @type {ActualAppOutput} */
        const actualAppOutput = ActualAppOutput.fromObject(sessionResults.getActualAppOutput()[0]);
        /** @type {ImageMatchSettings} */
        const imageMatchSettings = ImageMatchSettings.fromObject(actualAppOutput.getImageMatchSettings());

        if (that._expectedFloatingsRegions) {
          const f = imageMatchSettings.getFloating()[0];
          const floating = new FloatingMatchSettings(f.left, f.top, f.width, f.height, f.maxUpOffset, f.maxDownOffset, f.maxLeftOffset, f.maxRightOffset);

          deepEqual(that._expectedFloatingsRegions, floating, 'Floating regions lists differ');
        }

        if (that._expectedIgnoreRegions) {
          const ignoreRegions = Region.fromObject(imageMatchSettings.getIgnore()[0]);

          deepEqual(that._expectedIgnoreRegions, ignoreRegions, 'Ignore regions lists differ');
        }
      });
    }).catch(e => {
      if (e instanceof AssertionError) {
        error = e;
      }

      return that._eyes.abortIfNotClosed();
    }).then(() => {
      return that._browser.end();
    }).then(() => {
      if (error) {
        throw error;
      }
    });
  }

  afterTest() {
    if (!this._seleniumStandAloneMode && !(process.env.SELENIUM_SERVER_URL === 'http://ondemand.saucelabs.com/wd/hub'
        && process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY)) {
      if (this._browserName === 'chrome') {
        chromedriver.stop();
      } else if (this._browserName === 'firefox') {
        geckodriver.stop();
      }
    }
  }

  get eyes() {
    return this._eyes;
  }

  get browser() {
    return this._browser;
  }

  /**
   * @param {Region} expectedIgnoreRegions
   */
  setExpectedIgnoreRegions(expectedIgnoreRegions) {
    this._expectedIgnoreRegions = expectedIgnoreRegions;
  }

  /**
   * @param {FloatingMatchSettings} expectedFloatingsRegions
   */
  setExpectedFloatingsRegions(expectedFloatingsRegions) {
    /** @type {FloatingMatchSettings} */
    this._expectedFloatingsRegions = expectedFloatingsRegions;
  }


  static getDefaultPlatform() {
    let platform = process.platform;

    switch (process.platform) {
      case 'win32':
        platform = 'Windows';
        break;
      case 'linux':
        platform = 'Linux';
        break;
      case 'darwin':
        platform = 'macOS';
        break;
    }

    return platform;
  }

  static getSeleniumStandAloneMode() {
    return process.env.SELENIUM_STANDALONE_MODE ? eval(process.env.SELENIUM_STANDALONE_MODE): false;
  }
}

module.exports = Common;
