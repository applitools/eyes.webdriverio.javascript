'use strict';

const {TestFluentApi} = require('./TestFluentApi');
const Common = require('./Common');

const appName = 'Eyes Selenium SDK - Fluent API';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';

const test = new Common({testedPageUrl: testedPageUrl, browserName: 'firefox'});


const platforms = process.env.SELENIUM_SERVER_URL ? ['Linux', 'Windows 10'] : ['bla'];
platforms.forEach(function (platform) {
  describe(appName, function () {

    before(function () {
      return test.beforeTest({});
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

    TestFluentApi.shouldBehaveLike('TestFluentApi', test);
  });
});
