'use strict';

const chromedriver = require('chromedriver');
const {TestFluentApi} = require('./TestFluentApi');
const Common = require('./Common');


const appName = 'Eyes Selenium SDK - Fluent API - ForceFPS';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';

const test = new Common({testedPageUrl});


describe.skip(appName, function () {

  before(function () {
    chromedriver.start();
    test.beforeTest({fps: true});
  });

  beforeEach( function () {
    return test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.CHROME});
  });

  afterEach(function () {
    return test.afterEachTest();
  });

  after(function () {
    chromedriver.stop();
  });

  TestFluentApi.shouldBehaveLike('TestFluentApi', test);

});
