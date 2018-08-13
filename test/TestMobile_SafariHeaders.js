'use strict';

const webdriverio = require('webdriverio');
const {ConsoleLogHandler, BatchInfo} = require('@applitools/eyes.sdk.core');
const {TestUtils} = require('./TestUtils');
const {By, Eyes, Target, StitchMode} = require('../index');
const {equal} = require('assert');


let eyes;
let browser;

describe.skip('IOSTest', () => {
  this.timeout(60 * 1000 * 100);

  const batchInfo = new BatchInfo('WebDriverIO Tests');

  const dataProvider = [];
  dataProvider.push(...TestUtils.cartesianProduct(
    'iPhone X Simulator',
    ['portrait', 'landscape'],
    '11.0',
    [false, true]
  ));

  dataProvider.push(...TestUtils.cartesianProduct(
    ['iPhone 7 Simulator', 'iPhone 6 Plus Simulator'],
    ['portrait', 'landscape'],
    ['10.0', '11.0'],
    [false, true]
  ));

  dataProvider.forEach(row => {
    const [deviceName, deviceOrientation, platformVersion, fully] = row;

    let testName = `${deviceName} ${platformVersion} ${deviceOrientation}`;
    if (fully) testName += ' fully';

    it(testName, function () {
      eyes = new Eyes();
      eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
      eyes.setBatch(batchInfo);

      const caps = {};
      caps['appiumVersion'] = '1.7.2';
      caps['deviceName'] = deviceName;
      caps['deviceOrientation'] = deviceOrientation;
      caps['platformVersion'] = platformVersion;
      caps['platformName'] = 'iOS';
      caps['browserName'] = 'Safari';

      caps['username'] = process.env.SAUCE_USERNAME;
      caps['accesskey'] = process.env.SAUCE_ACCESS_KEY;

      const browserOptions = {
        port: '80',
        path: '/wd/hub',
        host: 'ondemand.saucelabs.com',
        desiredCapabilities: caps
      };

      browser = webdriverio.remote(browserOptions);
      return browser.init().then(() => {
        eyes.setLogHandler(new ConsoleLogHandler(true));
        eyes.setStitchMode(StitchMode.SCROLL);

        eyes.addProperty('Orientation', deviceOrientation);
        eyes.addProperty('Stitched', fully ? 'True' : 'False');

        return eyes.open(browser, 'Eyes Selenium SDK - iOS Safari Cropping', testName);
      }).url('https://www.applitools.com/customers').then(() => {
        return eyes.check('Initial view', Target.region(By.cssSelector('body')).fully(fully));
      }).then(result => {
        return equal(result.getAsExpected(), true);
      });
    });
  });

  afterEach(function () {
    return eyes.close(false).catch(() => {
      return eyes.abortIfNotClosed();
    }).then(() => {
      return browser.end();
    });
  });

});
