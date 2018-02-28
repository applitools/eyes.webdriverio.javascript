'use strict';

const webdriverio = require('webdriverio');
const {equal} = require('assert');
const {Eyes, Target} = require('../index');
const {RectangleSize} = require('@applitools/eyes.sdk.core');


const appName = 'TestServerStatus';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';

let eyes, browser;

describe(appName, function () {

  before(function () {
    eyes = new Eyes();
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setSaveNewTests(false);
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
    const driver = webdriverio.remote(chrome);
    browser = driver.init();
  });

  const teardown = async function () {
    try {
      return await eyes.close(false);
    } catch(e) {
      await eyes.abortIfNotClosed();
    } finally {
      await browser.end();
    }
  };


  it('TestSessionSummary_Status_Failed', async function () {
    const viewportSize = new RectangleSize({width: 800, height: 599});
    await eyes.open(browser, appName, appName, viewportSize);
    await browser.url(testedPageUrl);
    await eyes.check("TestSessionSummary_Status_Failed", Target.window());
    const r = await teardown();
    equal(r.isDifferent, true, 'Expected DiffsFoundError');
  });

  it('TestSessionSummary_Status_New', async function () {
    const time = Date.now();
    const viewportSize = new RectangleSize({width: 800, height: 599});
    await eyes.open(browser, appName + '_' + time, appName + '_' + time, viewportSize);
    await browser.url(testedPageUrl);
    await eyes.check("TestSessionSummary_Status_Failed", Target.window());
    const r = await teardown();
    equal(r.isNew, true, 'Expected NewTestError');
  });

});
