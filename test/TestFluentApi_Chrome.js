'use strict';

const chromedriver = require('chromedriver');
const {TestFluentApi} = require('./TestFluentApi');
const Common = require('./Common');


const appName = 'Eyes Selenium SDK - Fluent API';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';

const test = new Common({testedPageUrl});


describe(appName, function () {

  before(function () {
    chromedriver.start();
    test.beforeTest({});
  });

  beforeEach(function () {
    const browserOptions = Common.CHROME;
    browserOptions.port = '9515';
    browserOptions.path = '/';
    return test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: browserOptions});
  });

  afterEach(function () {
    return test.afterEachTest();
  });

  after(function () {
    chromedriver.stop();
  });

  TestFluentApi.shouldBehaveLike('TestFluentApi', test);

});
