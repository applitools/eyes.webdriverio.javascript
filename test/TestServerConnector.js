'use strict';

const webdriverio = require('webdriverio');
const {equal} = require('assert');
const {Eyes, Target} = require('../index');
const {RectangleSize} = require('@applitools/eyes.sdk.core');


const appName = 'TestServerConnector';

// todo
describe.skip(appName, function () {


  it('TestSessionSummary_Status_Failed', async function () {
    const eyes = new Eyes();
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);

    const chrome = {
      desiredCapabilities: {
        browserName: 'chrome',
        chromeOptions: {
          args: ['disable-infobars']
        }
      }
    };
    const driver = webdriverio.remote(chrome);
    const browser = driver.init();


    try {
      const viewportSize = new RectangleSize({width: 800, height: 600});
      await eyes.open(browser, appName, appName, viewportSize);
      await browser.url('https://applitools.com/helloworld');


      await eyes.check("Hello", Target.window());

      const results = eyes.close();

      results.delete();
    } finally {
      await browser.end();
      await eyes.abortIfNotClosed();
    }
  });

});
