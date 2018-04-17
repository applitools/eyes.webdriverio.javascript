'use strict';

const {TestClassicApi} = require('./TestClassicApi');
const Common = require('./Common');


const chromedriver = require('chromedriver');
const appName = 'Eyes Selenium SDK - Classic API';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';


const test = new Common({testedPageUrl});

const platforms = ['Linux'];

platforms.forEach(function (platform) {
  describe(appName, function () {

    before(function () {
      chromedriver.start();
      test.beforeTest({});
    });

    beforeEach(function () {
      const browserOptions = Common.CHROME;
      browserOptions.port = '9515';
      browserOptions.path = '/';
      return test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: browserOptions, platform: platform});
    });

    afterEach(function () {
      return test.afterEachTest();
    });

    after(function () {
      chromedriver.stop();
    });

    TestClassicApi.shouldBehaveLike('TestClassicApi', test);

  });
});
