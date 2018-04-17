'use strict';

const geckodriver = require('geckodriver');
const {TestClassicApi} = require('./TestClassicApi');
const Common = require('./Common');


const appName = 'Eyes Selenium SDK - Classic API';
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

  TestClassicApi.shouldBehaveLike('TestClassicApi', test);

});
