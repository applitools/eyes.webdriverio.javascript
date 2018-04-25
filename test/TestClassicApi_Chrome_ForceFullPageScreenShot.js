'use strict';

const {TestClassicApi} = require('./TestClassicApi');
const Common = require('./Common');

const appName = 'Eyes Selenium SDK - Classic API - ForceFPS';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';


const test = new Common({testedPageUrl: testedPageUrl, browserName: 'chrome'});

describe(appName, function () {

  before(function () {
    test.beforeTest({fps: true});
  });

  beforeEach(function () {
    return test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.CHROME});
  });

  afterEach(function () {
    return test.afterEachTest();
  });

  after(function () {
    test.afterTest();
  });

  TestClassicApi.shouldBehaveLike('TestClassicApi', test);
});
