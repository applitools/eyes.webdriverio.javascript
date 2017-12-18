'use strict';

const webdriverio = require('webdriverio');
const {Eyes, StitchMode} = require('../../index');
const {ConsoleLogHandler, RectangleSize} = require('eyes.sdk');


class TestSetup {

  constructor({appName, testedPageUrl}) {
    this._appName = appName;
    this._eyes = null;
    this._browser = null;
    this._options = null;
    this._testedPageUrl = testedPageUrl;
    this._forceFullPageScreenshot = false;

  }


  async beforeEach(t) {
    const driver = webdriverio.remote(this._options);
    this._browser = driver.init();

    this._eyes = new Eyes();
    this._eyes.setApiKey(process.env.API_KEY);
    this._eyes.setLogHandler(new ConsoleLogHandler(true));

    this._eyes.setForceFullPageScreenshot(this._forceFullPageScreenshot);
    this._eyes.setStitchMode(StitchMode.CSS);
    this._eyes.setHideScrollbars(true);

    this._eyes.setBatch(this._appName);


    const testName = t.title.replace('beforeEach for ', '');
    await this._eyes.open(this._browser, this._appName, testName, new RectangleSize(800, 600));

    await this._browser.url(this._testedPageUrl);
  }


  async afterEach() {
    await this._browser.end();
    await this._eyes.abortIfNotClosed();
  }


  get eyes() {
    return this._eyes;
  }

  set options(options) {
    this._options = options;
  }
}

module.exports = TestSetup;
