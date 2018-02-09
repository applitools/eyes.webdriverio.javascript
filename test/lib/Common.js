'use strict';

const {deepEqual} = require('assert');
const webdriverio = require('webdriverio');
const {Eyes, StitchMode} = require('../../index');
const {ConsoleLogHandler, FloatingMatchSettings, RectangleSize} = require('eyes.sdk');
const {URL} = require('url');
const netHelper = require('./NetHelper');


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
        browserName: 'firefox'
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
    this._eyes.setApiKey(process.env.API_KEY);
    this._eyes.setLogHandler(new ConsoleLogHandler(true));

    this._eyes.setForceFullPageScreenshot(fps);
    this._eyes.setStitchMode(stitchMode);
    this._eyes.setHideScrollbars(true);

    this._eyes.setBatch(batchName);

    // this._eyes.setSaveDebugScreenshots(true);
  }

  async beforeEachTest({
                         appName,
                         testName,
                         browserOptions: browserOptions,
                         rectangleSize = {
                           width: 800,
                           height: 600
                         }, testedPageUrl = this._testedPageUrl
                       }) {
    const driver = webdriverio.remote(browserOptions);
    this._browser = driver.init();
    await this._eyes.open(this._browser, appName, testName, new RectangleSize(rectangleSize));
    await this._browser.url(testedPageUrl);
    this._expectedFloatingsRegions = null;
  }

  async afterEachTest() {
    try {
      /**@type {TestResults} */
      const results = await this._eyes.close();

      if (this._expectedFloatingsRegions) {
        const apiSessionUrl = results.getApiUrls().session;

        const apiSessionUri = new URL(apiSessionUrl);
        apiSessionUri.searchParams.append('format', 'json');
        apiSessionUri.searchParams.append('AccessToken', results.getSecretToken());
        apiSessionUri.searchParams.append('apiKey', this.eyes.getApiKey());

        const res = await netHelper.get(apiSessionUri);

        const resultObject = JSON.parse(res);
        const actualAppOutput = resultObject.actualAppOutput;
        const f = actualAppOutput[0].imageMatchSettings.floating[0];

        const floating = new FloatingMatchSettings(f.left, f.top, f.width, f.height, f.maxUpOffset, f.maxDownOffset, f.maxLeftOffset, f.maxRightOffset);

        deepEqual(this._expectedFloatingsRegions, floating);
      }
    } finally {
      await this._browser.end();
      await this._eyes.abortIfNotClosed();
    }
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
