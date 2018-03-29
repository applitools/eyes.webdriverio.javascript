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

  beforeEachTest({
                   appName,
                   testName,
                   browserOptions: browserOptions,
                   rectangleSize = {
                     width: 800,
                     height: 600
                   }, testedPageUrl = this._testedPageUrl
                 }) {
    const that = this;
    this._browser = webdriverio.remote(browserOptions);
    return this._browser.init().then(() => {
      const viewportSize = rectangleSize ? new RectangleSize(rectangleSize) : null;

      if (that._eyes.getForceFullPageScreenshot()) {
        testName += '_FPS';
      }

      return this._eyes.open(this._browser, appName, testName, viewportSize);
    }).url(testedPageUrl).then(()=>{
      that._expectedFloatingsRegions = null;
    });
  }

  afterEachTest() {
    const that = this;
    return this._eyes.close(false).then(results => {
      if (that._expectedFloatingsRegions) {
        const apiSessionUrl = results.getApiUrls().session;

        const apiSessionUri = new URL(apiSessionUrl);
        apiSessionUri.searchParams.append('format', 'json');
        apiSessionUri.searchParams.append('AccessToken', results.getSecretToken());
        apiSessionUri.searchParams.append('apiKey', this.eyes.getApiKey());

        return netHelper.get(apiSessionUri).then(res => {
          const resultObject = JSON.parse(res);
          const actualAppOutput = resultObject.actualAppOutput;
          const f = actualAppOutput[0].imageMatchSettings.floating[0];

          const floating = new FloatingMatchSettings(f.left, f.top, f.width, f.height, f.maxUpOffset, f.maxDownOffset, f.maxLeftOffset, f.maxRightOffset);

          deepEqual(that._expectedFloatingsRegions, floating);
        });
      } else {
        return Promise.resolve()
      }
    }).catch(() => {
      return that._eyes.abortIfNotClosed();
    }).then(() => {
      return that._browser.end();
    });
  }

  afterTest() {
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
