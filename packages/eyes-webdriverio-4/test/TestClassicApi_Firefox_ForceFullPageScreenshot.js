'use strict';

const {TestClassicApi} = require('./TestClassicApi');
const Common = require('./Common');

const appName = 'Eyes Selenium SDK - Classic API - ForceFPS';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';


const test = new Common({testedPageUrl: testedPageUrl, browserName: 'firefox'});


const platforms = process.env.SELENIUM_SERVER_URL ? ['Linux', 'Windows 10'] : ['bla'];
platforms.forEach(function (platform) {
  describe.skip(appName, function () {

    before(function () {
      return test.beforeTest({fps: true});
    });

    beforeEach(function () {
      return test.beforeEachTest({
        appName: appName,
        testName: this.currentTest.title,
        browserOptions: Common.FIREFOX,
        platform: platform
      });
    });

    afterEach(function () {
      return test.afterEachTest();
    });

    after(function () {
      return test.afterTest();
    });

    TestClassicApi.shouldBehaveLike('TestClassicApi', test);

  });
});
