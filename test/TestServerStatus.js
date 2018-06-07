'use strict';

const chromedriver = require('chromedriver');
const webdriverio = require('webdriverio');
const {equal} = require('assert');
const {Eyes, Target} = require('../index');
const {RectangleSize} = require('@applitools/eyes.sdk.core');
const Common = require('./Common');


const appName = 'TestServerStatus';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';

let eyes, browser;

describe.skip(appName, function () {

  before(function () {
    chromedriver.start();
    eyes = new Eyes();
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setSaveNewTests(false);
  });

  beforeEach(function () {
    const chrome = Common.CHROME;
    chrome.port = '9515';
    chrome.path = '/';
    browser = webdriverio.remote(chrome);
    return browser.init();
  });

  after(function () {
    chromedriver.stop();
  });

  const teardown = function () {
    let result;
    return eyes.close().catch(() => {
      return eyes.abortIfNotClosed();
    }).then(r => {
      result = r;
      return browser.end();
    }).then(() => {
      return result;
    });
  };


  it('TestSessionSummary_Status_Failed', function () {
    return browser.then(() => {
      const viewportSize = new RectangleSize({width: 800, height: 599});
      return eyes.open(browser, appName, appName, viewportSize);
    }).url(testedPageUrl).then(() => {
      return eyes.check("TestSessionSummary_Status_Failed", Target.window());
    }).then(() => {
      return teardown();
    }).then(r => {
      equal(r.isDifferent, true, 'Expected DiffsFoundError');
    });
  });

  it('TestSessionSummary_Status_New', function () {
    return browser.then(() => {
      const time = Date.now();
      const viewportSize = new RectangleSize({width: 800, height: 599});
      return eyes.open(browser, appName + '_' + time, appName + '_' + time, viewportSize);
    }).url(testedPageUrl).then(() => {
      return eyes.check("TestSessionSummary_Status_Failed", Target.window());
    }).then(() => {
      return teardown();
    }).then(r => {
      equal(r.isNew, true, 'Expected NewTestError');
    });
  });

});
