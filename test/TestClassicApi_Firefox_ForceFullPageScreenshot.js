'use strict';

const geckodriver = require('geckodriver');
const {TestClassicApi} = require('./TestClassicApi');
const Common = require('./Common');


const appName = 'Eyes Selenium SDK - Classic API - ForceFPS';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';


const test = new Common({testedPageUrl});


describe(appName, function () {

  before(function () {
    geckodriver.start();
    test.beforeTest({fps: true});
  });

  beforeEach(function () {
    return test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.FIREFOX});
  });

  afterEach(function () {
    return test.afterEachTest();
  });

  after(function () {
    geckodriver.stop();
  });

  TestClassicApi.shouldBehaveLike('TestClassicApi', test);

});
