'use strict';

const chromedriver = require('chromedriver');
const {TestClassicApi} = require('./TestClassicApi');
const Common = require('./Common');


const appName = 'Eyes Selenium SDK - Classic API - ForceFPS';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';


const test = new Common({testedPageUrl});

describe(appName, function () {

  before(function () {
    chromedriver.start();
    test.beforeTest({fps: true});
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

  TestClassicApi.shouldBehaveLike('TestClassicApi', test);
});
