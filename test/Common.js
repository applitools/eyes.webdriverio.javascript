'use strict';

const {deepEqual} = require('assert');
const webdriverio = require('webdriverio');
const {Eyes, NetHelper, StitchMode} = require('../index');
const {BatchInfo, ConsoleLogHandler, FloatingMatchSettings, RectangleSize} = require('@applitools/eyes.sdk.core');
const {URL} = require('url');

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
  constructor({testedPageUrl}) {
    this._eyes = null;
    this._browser = null;
    this._testedPageUrl = testedPageUrl;
    this._forceFullPageScreenshot = false;
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
                         test
                       }) {
    try {
      if (process.env.SELENIUM_SERVER_URL) {
        const seleniumServerUrl = new URL(process.env.SELENIUM_SERVER_URL);
        // todo
        // browserOptions.host = seleniumServerUrl.hostname;
      }

      if (process.env.SELENIUM_SERVER_URL === 'http://ondemand.saucelabs.com/wd/hub'
        && process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY) {

        const seleniumServerUrl = new URL(process.env.SELENIUM_SERVER_URL);
        browserOptions.host = seleniumServerUrl.hostname;

        browserOptions.port = '80';
        browserOptions.path = '/wd/hub';

        browserOptions.desiredCapabilities.baseUrl = `http://${process.env.SAUCE_USERNAME}:${process.env.SAUCE_ACCESS_KEY}@ondemand.saucelabs.com:80/wd/hub`;
        browserOptions.desiredCapabilities.username = process.env.SAUCE_USERNAME;
        browserOptions.desiredCapabilities.accesskey = process.env.SAUCE_ACCESS_KEY;
      }

      const driver = webdriverio.remote(browserOptions);
      this._browser = driver.init();
      const viewportSize = rectangleSize ? new RectangleSize(rectangleSize) : null;
      if (this._eyes.getForceFullPageScreenshot()) {
        testName += '_FPS';
      }
      await this._eyes.open(this._browser, appName, testName, viewportSize);
      await this._browser.url(testedPageUrl);
      this._expectedFloatingsRegions = null;
    } catch (e) {
      if (test) {
        test.skip();
      } else {
        throw e;
      }
    }
  }

  async afterEachTest() {
    try {
      /**@type {TestResults} */
      const results = await this._eyes.close(false);

      if (this._expectedFloatingsRegions) {
        const apiSessionUrl = results.getApiUrls().session;

        const apiSessionUri = new URL(apiSessionUrl);
        apiSessionUri.searchParams.append('format', 'json');
        apiSessionUri.searchParams.append('AccessToken', results.getSecretToken());
        apiSessionUri.searchParams.append('apiKey', this.eyes.getApiKey());

        const res = await NetHelper.get(apiSessionUri);

        const resultObject = JSON.parse(res);
        const actualAppOutput = resultObject.actualAppOutput;
        const f = actualAppOutput[0].imageMatchSettings.floating[0];

        const floating = new FloatingMatchSettings(f.left, f.top, f.width, f.height, f.maxUpOffset, f.maxDownOffset, f.maxLeftOffset, f.maxRightOffset);

        deepEqual(this._expectedFloatingsRegions, floating);
      }
    } catch (ignored) {
      await this._eyes.abortIfNotClosed();
    } finally {
      await this._browser.end();
    }
  }

  async afterTest() {
  }

  get eyes() {
    return this._eyes;
  }

  get browser() {
    return this._browser;
  }

  /**
   *
   * @param {FloatingMatchSettings} expectedFloatingsRegions
   */
  setExpectedFloatingsRegions(expectedFloatingsRegions) {
    /** @type {FloatingMatchSettings} */
    this._expectedFloatingsRegions = expectedFloatingsRegions;
  }

}

module.exports = Common;
