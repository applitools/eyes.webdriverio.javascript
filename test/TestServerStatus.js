'use strict';

const {equal} = require('assert');
const {By} = require('../index');
const Common = require('./lib/Common');


const appName = 'Eyes Selenium SDK';


const test = new Common({});


describe(appName, function () {

  before(function () {
    test.beforeTest({batchName: 'WIX like test', fps: true});
  });

  beforeEach(async function () {
    const chrome = {
      desiredCapabilities: {
        browserName: 'chrome',
        chromeOptions: {
          args: ['disable-infobars']
        }
      }
    };
    await test.beforeEachTest({
      appName: appName,
      testName: this.currentTest.title,
      browserOptions: chrome
    });
  });

  afterEach(async function () {
    await test.afterEachTest();
  });


  xit('TestSessionSummary_Status_Failed', async function () {
  });

  xit('TestSessionSummary_Status_New', async function () {
  });

});
