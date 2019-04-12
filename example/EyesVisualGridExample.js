'use strict';

const chromedriver = require('chromedriver');
const webdriverio = require('webdriverio');
const {By, Eyes, Target, VisualGridRunner} = require('../index'); // should be replaced to '@applitools/eyes.webdriverio'
const {BrowserType, Configuration, DeviceName, ScreenOrientation} = require('@applitools/eyes-selenium');

(async () => {
  chromedriver.start();

  // Open a Chrome browser.
  const chrome = {
    desiredCapabilities: {
      browserName: 'chrome'
    }
  };
  let driver = webdriverio.remote(chrome);
  await driver.init();

  // Initialize the eyes SDK
  const eyes = new Eyes(new VisualGridRunner(3));

  try {
    const configuration = new Configuration();
    configuration.setAppName('Eyes Examples');
    configuration.setTestName('My first Javascript test!');
    configuration.addBrowser(800, 600, BrowserType.CHROME);
    configuration.addBrowser(500, 400, BrowserType.FIREFOX);
    configuration.addBrowser(500, 400, BrowserType.IE_11);
    configuration.addDeviceEmulation(DeviceName.iPhone_4, ScreenOrientation.PORTRAIT);
    // set your private API key
    configuration.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setConfiguration(configuration);

    driver = await eyes.open(driver);

    // Navigate the browser to the "hello world!" web-site.
    await driver.url('https://applitools.com/helloworld');

    // Visual checkpoint #1.
    await eyes.check('Main Page', Target.window());

    // Click the "Click me!" button.
    await driver.click(By.cssSelector('button'));

    // Visual checkpoint #2.
    await eyes.check('Click!', Target.window());

    // End the test.
    // const results = await eyes.close(); // will return only first TestResults, but as we have two browsers, we need more results
    const results = await eyes.getRunner().getAllResults(false);
    console.log(results);
  } finally {
    // Close the browser.
    await driver.end();

    // If the test was aborted before eyes.close was called ends the test as aborted.
    await eyes.abortIfNotClosed();

    chromedriver.stop();
  }
})();
