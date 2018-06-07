'use strict';

const {TestSpecialCases} = require('./TestSpecialCases');
const Common = require('./Common');

const appName = 'Eyes Selenium SDK - Special Cases - ForceFPS';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/WixLikeTestPage/index.html';


const test = new Common({testedPageUrl: testedPageUrl, browserName: 'chrome'});


describe.skip(appName, function () {

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

  TestSpecialCases.shouldBehaveLike('TestSpecialCases', test);
});
