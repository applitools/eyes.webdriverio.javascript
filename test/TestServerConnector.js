'use strict';

const chromedriver = require('chromedriver');
const webdriverio = require('webdriverio');
const {equal} = require('assert');
const {Eyes, Target} = require('../index');
const {RectangleSize} = require('@applitools/eyes.sdk.core');


const appName = 'TestServerConnector';

// todo
describe.skip(appName, function () {


  it('TestSessionSummary_Status_Failed', function () {
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
    const browser = webdriverio.remote(chrome);
    return browser.init().then(() => {
      const viewportSize = new RectangleSize({width: 800, height: 600});

      return eyes.open(browser, appName, appName, viewportSize);
    }).url('https://applitools.com/helloworld').then(() => {
      return eyes.check("Hello", Target.window());
    }).then(() => {
      const results = eyes.close();
    }).catch(e => {
      console.error(e.message);
      return eyes.abortIfNotClosed();
    }).then(/** @type {TestResults} */results => {
      results.delete();

      return browser.end();
    }).then(() => {
      chromedriver.stop();
    })
  });
});
