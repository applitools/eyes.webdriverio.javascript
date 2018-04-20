'use strict';

const chromedriver = require('chromedriver');
const {TestSpecialCases} = require('./TestSpecialCases');
const Common = require('./Common');


const appName = 'Eyes Selenium SDK - Special Cases - ForceFPS';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/WixLikeTestPage/index.html';


const test = new Common({testedPageUrl});


describe.skip(appName, function () {

  before(function () {
    chromedriver.start();
    test.beforeTest({fps: true});
  });

  beforeEach(function () {
    const chrome = Common.CHROME;
    chrome.port = '9515';
    chrome.path = '/';
    return test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: chrome});
  });

  afterEach(function () {
    return test.afterEachTest();
  });

  after(function () {
    chromedriver.stop();
  });

  TestSpecialCases.shouldBehaveLike('TestSpecialCases', test);

});
