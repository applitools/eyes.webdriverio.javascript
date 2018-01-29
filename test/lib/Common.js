'use strict';

const webdriverio = require('webdriverio');
const {Eyes, StitchMode} = require('../../index');
const {ConsoleLogHandler, RectangleSize} = require('eyes.sdk');


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

  constructor({testedPageUrl}) {
    this._eyes = null;
    this._browser = null;
    this._options = null;
    this._testedPageUrl = testedPageUrl;
    this._forceFullPageScreenshot = false;
    this._stitchMode = StitchMode.CSS;

  }

  beforeTest({appName, fps = false, stitchMode = StitchMode.CSS}) {
    this._eyes = new Eyes();
    this._eyes.setApiKey(process.env.API_KEY);
    this._eyes.setLogHandler(new ConsoleLogHandler(true));

    this._eyes.setForceFullPageScreenshot(fps);
    this._eyes.setStitchMode(stitchMode);
    this._eyes.setHideScrollbars(true);

    this._eyes.setBatch(appName);

    // this._eyes.setSaveDebugScreenshots(true);
  }

  async beforeEachTest({appName, testName, browserOptions: browserOptions}) {
    const driver = webdriverio.remote(browserOptions);
    this._browser = driver.init();
    await this._eyes.open(this._browser, appName, testName, new RectangleSize(800, 600));
    await this._browser.url(this._testedPageUrl);
  }

  async afterEachTest() {
    try {
      await this._eyes.close();
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

}

module.exports = Common;
