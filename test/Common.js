'use strict';

const {AssertionError, deepEqual} = require('assert');
const webdriverio = require('webdriverio');
const chromedriver = require('chromedriver');
const geckodriver = require('geckodriver');
const {Configuration, Eyes, NetHelper, StitchMode} = require('../index');
const {
  BatchInfo,
  ConsoleLogHandler,
  FloatingMatchSettings,
  metadata,
  RectangleSize,
  Region,
  TypeUtils,
  AccessibilityRegionByRectangle,
  AccessibilityLevel
} = require('@applitools/eyes-sdk-core');
const {ActualAppOutput, ImageMatchSettings, SessionResults} = metadata;
const url = require('url');

const batchName = TypeUtils.getOrDefault(process.env.APPLITOOLS_BATCH_NAME, 'WebDriverIO Tests');
let batchInfo = new BatchInfo(batchName);

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
        browserName: 'safari',
        version: '11.1'
      }
    }
  };

  /**
   *
   * @param {Object} options
   */
  constructor({testedPageUrl, browserName, mobileBrowser = false}) {
    this._eyes = null;
    this._browser = null;
    this._browserName = browserName;
    this._testedPageUrl = testedPageUrl;
    this._forceFullPageScreenshot = false;
    this._seleniumStandAloneMode = Common.getSeleniumStandAloneMode();
    this._mobileBrowser = mobileBrowser;
  }

  beforeTest({batchName: batchName, fps = false, stitchMode = StitchMode.CSS}) {
    this._eyes = new Eyes();
/*
  TODO
    const configuration = new Configuration();
    configuration.setApiKey(process.env.APPLITOOLS_FABRIC_API_KEY);
    configuration.setServerUrl('https://eyesfabric4eyes.applitools.com');
    configuration.setAccessibilityValidation(AccessibilityLevel.AAA);
    this._eyes.setConfiguration(configuration);
*/

    this._eyes.setApiKey(process.env.APPLITOOLS_API_KEY);

    this._eyes.setLogHandler(new ConsoleLogHandler(true));

    this._eyes.setForceFullPageScreenshot(fps);
    this._eyes.setStitchMode(stitchMode);
    this._eyes.setHideScrollbars(true);

    const proxy = TypeUtils.getOrDefault(process.env.APPLITOOLS_PROXY, null);
    if (proxy) {
      this._eyes.setProxy(proxy);
    }

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
        this._eyes._logger.verbose('Chromedriver is started');
      } else if (this._browserName === 'firefox') {
        geckodriver.start();
        this._eyes._logger.verbose('Geckodriver is started');
      }
    }
  }

  async beforeEachTest({
                         appName,
                         testName,
                         browserOptions: browserOptions,
                         rectangleSize = {
                           width: 800,
                           height: 600
                         },
                         testedPageUrl = this._testedPageUrl,
                         platform = Common.getPlatform(browserOptions)
                       }) {

    if (process.env.SELENIUM_SERVER_URL === 'http://ondemand.saucelabs.com/wd/hub'
      && process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY) {
      this._eyes._logger.verbose('Sauce is used');

      const seleniumServerUrl = url.parse(process.env.SELENIUM_SERVER_URL);
      browserOptions.host = seleniumServerUrl.hostname;

      browserOptions.port = '80';
      browserOptions.path = '/wd/hub';
      // browserOptions.desiredCapabilities.seleniumVersion = '3.11.0';

      browserOptions.desiredCapabilities.baseUrl = `http://${process.env.SAUCE_USERNAME}:${process.env.SAUCE_ACCESS_KEY}@ondemand.saucelabs.com:80/wd/hub`;
      browserOptions.desiredCapabilities.username = process.env.SAUCE_USERNAME;
      browserOptions.desiredCapabilities.accesskey = process.env.SAUCE_ACCESS_KEY;
      browserOptions.desiredCapabilities.platform = platform;
      browserOptions.desiredCapabilities.seleniumVersion = '3.14.0';
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
    await this._browser.init();
    const viewportSize = null;

    if (that._eyes.getForceFullPageScreenshot()) {
      testName += '_FPS';
    }

    if (that._mobileBrowser) {
      testName += '_Mobile';
    }

    this._browser = await this._eyes.open(this._browser, appName, testName, viewportSize);
    await this._browser.url(testedPageUrl);
    that._expectedFloatingsRegions = null;
    that._expectedIgnoreRegions = null;
    that._expectedAccessibilityRegions = null;
  }

  async afterEachTest() {
    let error;
    try {
      const results = await this._eyes.close(false);
      const query = `?format=json&AccessToken=${results.getSecretToken()}&apiKey=${this.eyes.getApiKey()}`;
      const apiSessionUrl = results.getApiUrls().getSession() + query;

      const apiSessionUri = url.parse(apiSessionUrl);
      // apiSessionUri.searchParams.append('format', 'json');
      // apiSessionUri.searchParams.append('AccessToken', results.getSecretToken());
      // apiSessionUri.searchParams.append('apiKey', this.eyes.getApiKey());

      const res = await NetHelper.get(apiSessionUri);
      const resultObject = JSON.parse(res);
      /** @type {SessionResults} */
      const sessionResults = new SessionResults(resultObject);
      /** @type {ActualAppOutput} */
      const actualAppOutput = new ActualAppOutput(sessionResults.getActualAppOutput()[0]);
      /** @type {ImageMatchSettings} */
      const imageMatchSettings = new ImageMatchSettings(actualAppOutput.getImageMatchSettings());

      if (this._expectedFloatingsRegions) {
        const f = imageMatchSettings.getFloating()[0];
        const floating = new FloatingMatchSettings(f.left, f.top, f.width, f.height, f.maxUpOffset, f.maxDownOffset, f.maxLeftOffset, f.maxRightOffset);

        deepEqual(this._expectedFloatingsRegions, floating, 'Floating regions lists differ');
      }

      if (this._expectedIgnoreRegions) {
        const ignoreRegions = new Region(imageMatchSettings.getIgnore());

        deepEqual(this._expectedIgnoreRegions, ignoreRegions, 'Ignore regions lists differ');
      }

      // if (this._expectedAccessibilityRegions) {
      //   const accessibilityRegions = new Region(imageMatchSettings.getAccessibility());
      //
      //   deepEqual(this._expectedAccessibilityRegions, accessibilityRegions, 'Accessibility regions lists differ');
      // }


    } catch (e) {
      if (e instanceof AssertionError) {
        error = e;
      }

      return this._eyes.abortIfNotClosed();
    } finally {
      await this._browser.end();

      if (error) {
        throw error;
      }
    }
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
  setExpectedIgnoreRegions(...expectedIgnoreRegions) {
    this._expectedIgnoreRegions = expectedIgnoreRegions;
  }

  /**
   * @param {AccessibilityRegionByRectangle[]} expectedAccessibilityRegions
   */
  setExpectedAccessibilityRegions(...expectedAccessibilityRegions) {
    this._expectedAccessibilityRegions = expectedAccessibilityRegions;
  }

  /**
   * @param {FloatingMatchSettings} expectedFloatingsRegions
   */
  setExpectedFloatingsRegions(expectedFloatingsRegions) {
    /** @type {FloatingMatchSettings} */
    this._expectedFloatingsRegions = expectedFloatingsRegions;
  }


  static getPlatform(browserOptions) {
    let platform;
    if (browserOptions && browserOptions.desiredCapabilities
      && (browserOptions.desiredCapabilities.platform || browserOptions.desiredCapabilities.platformName)) {
      if (browserOptions.desiredCapabilities.platform) {
        platform = browserOptions.desiredCapabilities.platform;
      } else {
        platform = browserOptions.desiredCapabilities.platformName;
      }
    } else {
      platform = process.platform;

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
        default:
      }
    }

    return platform;
  }

  static getSeleniumStandAloneMode() {
    return process.env.SELENIUM_STANDALONE_MODE ? eval(process.env.SELENIUM_STANDALONE_MODE) : false;
  }
}

module.exports = Common;
