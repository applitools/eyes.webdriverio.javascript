'use strict';

const {TestSpecialCases} = require('./TestMobile');
const webdriverio = require('webdriverio');
const {Eyes} = require('../index');
const {BatchInfo, ConsoleLogHandler} = require('@applitools/eyes.sdk.core');
const url = require('url');

const appName = 'Eyes Selenium SDK - Mobile';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/WixLikeTestPage/index.html';

let batchInfo = new BatchInfo('WebDriverIO Mobile Tests');
const test = {};

describe(appName, function () {

  before(function () {
    test.eyes = new Eyes();
    test.eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    test.eyes.setLogHandler(new ConsoleLogHandler(true));

    test.eyes.setHideScrollbars(true);

    test.eyes.setBatch(batchInfo);

    // eyes.setSaveDebugScreenshots(true);
  });

  beforeEach(function () {
    const caps = {};
    caps['browserName'] = 'Chrome';
    caps['deviceName'] = 'Android Emulator';
    caps['deviceOrientation'] = 'portrait';
    caps['platformVersion'] = '6';
    caps['platformName'] = 'Android';

    const browserOptions = {desiredCapabilities: caps};

    const seleniumServerUrl = url.parse(process.env.SELENIUM_SERVER_URL);
    browserOptions.host = seleniumServerUrl.hostname;

    browserOptions.port = '80';
    browserOptions.path = '/wd/hub';

    browserOptions.desiredCapabilities.baseUrl = `http://${process.env.SAUCE_USERNAME}:${process.env.SAUCE_ACCESS_KEY}@ondemand.saucelabs.com:80/wd/hub`;
    browserOptions.desiredCapabilities.username = process.env.SAUCE_USERNAME;
    browserOptions.desiredCapabilities.accesskey = process.env.SAUCE_ACCESS_KEY;
    browserOptions.desiredCapabilities.platform = 'Linux';

    test.browser = webdriverio.remote(browserOptions);
    return test.browser.init().then(() => {
      return test.eyes.open(test.browser, appName, this.currentTest.title);
    }).url(testedPageUrl);
  });

  afterEach(function () {
    return test.eyes.close(false).catch(() => {
      return test.eyes.abortIfNotClosed();
    }).then(() => {
      return test.browser.end();
    });
  });


  TestSpecialCases.shouldBehaveLike('TestMobile', test);
});
