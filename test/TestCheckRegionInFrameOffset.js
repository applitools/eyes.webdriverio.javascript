'use strict';

const {equal} = require('assert');
const {By, Target} = require('../index');
const Common = require('./lib/Common');


const appName = 'Eyes Selenium SDK';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/WixLikeTestPage/index.html';


const test = new Common({testedPageUrl});


describe(appName, function () {

  before(function () {
    test.beforeTest({batchName: 'WIX like test', fps: true});
  });

  beforeEach(async function () {
    const chrome = {
      desiredCapabilities: {
        browserName: 'chrome'
      }
    };
    await test.beforeEachTest({
      appName: appName,
      testName: 'WIX like test',
      browserOptions: chrome,
      rectangleSize: {width: 1024, height: 600}
    });
  });

  afterEach(async function () {
    await test.afterEachTest();
  });


  it('WIX like test', async function () {
    const result = await test.eyes.check("map", Target.frame("frame1").region(By.tagName("img")));
    equal(result.asExpected, true);
  });

});
