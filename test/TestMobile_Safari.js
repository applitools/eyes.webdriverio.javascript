'use strict';

const {TestSpecialCases} = require('./TestMobile');
const Common = require('./Common');

const appName = 'Eyes Selenium SDK - Mobile';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';


const test = new Common({testedPageUrl: testedPageUrl, mobileBrowser: true});

describe(appName, function () {

  before(function () {
    test.beforeTest({});
  });

  beforeEach(function () {
    const caps = {};
    caps['browserName'] = 'Safari';
    caps['appiumVersion'] = '1.7.2';
    caps['deviceName'] = 'iPhone X Simulator';
    caps['deviceOrientation'] = 'portrait';
    caps['platformVersion'] = '11.2';
    caps['platformName'] = 'iOS';
    caps['locationContextEnabled'] = true;
    caps['nativeEvents'] = true;
    caps['handlesAlerts'] = true;

    const browserOptions = {desiredCapabilities: caps};

    return test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: browserOptions});
  });

  afterEach(function () {
    return test.afterEachTest();
  });

  after(function () {
    test.afterTest();
  });

  TestSpecialCases.shouldBehaveLike('TestMobile', test);
});
