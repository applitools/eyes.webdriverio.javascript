'use strict';

const chromedriver = require('chromedriver');
const {remote} = require('webdriverio');
const {By, Eyes, Target, VisualGridRunner} = require('../index'); // should be replaced to '@applitools/eyes.webdriverio'
const {BrowserType, Configuration, DeviceName, ScreenOrientation} = require('@applitools/eyes-selenium');

(async () => {
  chromedriver.start();

  // Open a Chrome browser.
  const chrome = {
    capabilities: {
      browserName: 'chrome'
    }
  };
  let driver = await remote(chrome);

  // Initialize the eyes SDK and set your private API key.
  const eyes = new Eyes(new VisualGridRunner(3));
  // eyes.setApiKey('Your API Key');
  eyes.setApiKey(process.env.APPLITOOLS_API_KEY);

  try {
    const configuration = new Configuration();
    configuration.setAppName('Eyes Examples');
    configuration.setTestName('My first Javascript test!');
    configuration.addBrowser(800, 500, BrowserType.CHROME);
    configuration.addBrowser(700, 600, BrowserType.FIREFOX);
    configuration.addDeviceEmulation(DeviceName.iPhone_4, ScreenOrientation.PORTRAIT);
    eyes.setConfiguration(configuration);

    driver = await eyes.open(driver);

    // Navigate the browser to the "hello world!" web-site.
    await driver.url('https://applitools.com/helloworld');

    // Visual checkpoint #1.
    await eyes.check('Main Page', Target.window());

    // Click the "Click me!" button.
    const el = await driver.findElement(By.css('button'));
    await el.click();

    // Visual checkpoint #2.
    await eyes.check('Click!', Target.window());

    // End the test.
    // const results = await eyes.close(); // will return only first TestResults, but as we have two browsers, we need more results
    const results = await eyes.getRunner().getAllResults(false);
    console.log(results);
  } catch (e) {
    console.log(e);
  } finally {
    // Close the browser.
    await driver.deleteSession();

    // If the test was aborted before eyes.close was called ends the test as aborted.
    await eyes.abortIfNotClosed();

    await chromedriver.stop();
  }
})();
