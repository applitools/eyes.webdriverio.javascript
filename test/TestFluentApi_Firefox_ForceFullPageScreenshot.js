'use strict';

const {TestFluentApi} = require('./TestFluentApi');
const Common = require('./Common');

const appName = 'Eyes Selenium SDK - Fluent API - ForceFPS';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';

const test = new Common({testedPageUrl: testedPageUrl, browserName: 'firefox'});


describe(appName, function () {

  before(function () {
    test.beforeTest({fps: true});
  });

  beforeEach(function () {
    return test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.FIREFOX});
  });

  afterEach(function () {
    return test.afterEachTest();
  });

  after(function () {
    test.afterTest();
  });

  TestFluentApi.shouldBehaveLike('TestFluentApi', test);
});
