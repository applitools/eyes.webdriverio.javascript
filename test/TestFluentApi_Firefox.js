'use strict';

const geckodriver = require('geckodriver');
const {TestFluentApi} = require('./TestFluentApi');
const Common = require('./Common');


const appName = 'Eyes Selenium SDK - Fluent API';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';

const test = new Common({testedPageUrl});


describe(appName, function () {

  before(function () {
    geckodriver.start();
    test.beforeTest({});
  });

  beforeEach(function () {
    const browserOptions = Common.FIREFOX;
    browserOptions.path = '/';
    return test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: browserOptions});
  });

  afterEach(function () {
    return test.afterEachTest();
  });

  after(function () {
    geckodriver.stop();
  });

  TestFluentApi.shouldBehaveLike('TestFluentApi', test);
});
