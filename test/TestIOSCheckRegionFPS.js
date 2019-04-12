'use strict';

const chromedriver = require('chromedriver');
const webdriverio = require('webdriverio');
const {BatchInfo, Region, ConsoleLogHandler} = require('@applitools/eyes-sdk-core');
const {BrowserType, Configuration} = require('@applitools/eyes-selenium');
const {By, Eyes, Target, VisualGridRunner} = require('../index');


let browser;

const bsUser = process.env.BS_USER;
const bsKey = process.env.BS_KEY;

const bsOptions = {
  user: bsUser,
  key: bsKey,

  seleniumHost: 'hub-cloud.browserstack.com',
  seleniumPort: 443,

  desiredCapabilities: {
    'os_version': '11.0',
    'device': 'iPhone X',
    'real_mobile': 'true',
    'browserstack.local': 'false',
    'browser': 'safari'
  }
};

describe.skip('BS ios test', function () {
  this.timeout(5 * 60 * 1000);

  before(async function () {
    chromedriver.start();
  });

  beforeEach(function () {
    browser = webdriverio.remote(bsOptions);
    return browser.init();
  });

  after(async function () {
    chromedriver.stop();
  });

  it('IOSCheckRegionFPS', async function () {
    await browser.url('https://applitools.github.io/demo/TestPages/VisualGridTestPage');

    const eyes = new Eyes();
    eyes.setSendDom(false);
    eyes.setLogHandler(new ConsoleLogHandler(true));
    eyes.setForceFullPageScreenshot(true);

    const configuration = new Configuration();
    configuration.setAppName('Hello World!');
    configuration.setTestName('My first WebdriverIO iOS test!');
    configuration.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setConfiguration(configuration);


    await browser
      .timeouts('script', 60000)
      .url('https://applitools.com/helloworld')
      .waitForExist('body > div > div.section.button-section', 60000);


    try { // Start the test and set the browser's viewport size to 800x600.
      await eyes.open(browser);
      //await eyes.check("Capture Title", Target.region(By.cssSelector("div.fancy.title.primary")));
      await eyes.check("Region by element", Target.region(By.cssSelector("div.fancy.title.primary")));
      //await eyes.checkRegionBy(By.cssSelector('div.fancy.title.primary'), 'Title');
      await eyes.checkWindow('Window');

      await eyes.close(false);
    } catch (e) {
      console.error(e);
    } finally {
      await browser.end();
      await eyes.abortIfNotClosed();
    }


  });

});
