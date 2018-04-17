'use strict';

const {TestFluentApi} = require('./TestFluentApi');
const Common = require('./Common');


const appName = 'Eyes Selenium SDK - Fluent API - ForceFPS';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';

const test = new Common({testedPageUrl});


let platforms = ['macOS'];
platforms.forEach(function (platform) {
  describe.skip(appName, function () {

    before(function () {
      test.beforeTest({fps: true});
    });

    beforeEach(function () {
      return test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.SAFARI, platform: platform});
    });

    afterEach(function () {
      return test.afterEachTest();
    });


    TestFluentApi.shouldBehaveLike('TestFluentApi', test);

  });
});
