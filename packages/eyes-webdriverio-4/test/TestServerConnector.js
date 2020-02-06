'use strict';

const chromedriver = require('chromedriver');
const webdriverio = require('webdriverio');
const {equal} = require('assert');
const {Eyes, Target} = require('../index');
const {RectangleSize} = require('@applitools/eyes-sdk-core');


const appName = 'TestServerConnector';

// todo
describe.skip(appName, function () {


  it('TestSessionSummary_Status_Failed', async () => {
    const eyes = new Eyes();
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);

    chromedriver.start();

    const chrome = {
      desiredCapabilities: {
        browserName: 'chrome',
        chromeOptions: {
          args: ['disable-infobars']
        }
      }
    };
    chrome.port = '9515';
    chrome.path = '/';

    let browser;
    let results;
    try {
      browser = webdriverio.remote(chrome);
      await browser.init();
      const viewportSize = new RectangleSize({width: 800, height: 600});

      browser = await eyes.open(browser, appName, appName, viewportSize);
      await browser.url('https://applitools.com/helloworld');
      await eyes.check("Hello", Target.window());
      results = await eyes.close();
    } catch (e) {
      console.error(e.message);
      await eyes.abortIfNotClosed();
    } finally {
      results.delete();
      await browser.end();
      chromedriver.stop();
    }
  });
});
