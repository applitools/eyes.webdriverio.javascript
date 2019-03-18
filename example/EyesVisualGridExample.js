'use strict';

const chromedriver = require('chromedriver');
const webdriverio = require('webdriverio');
const {By, Eyes, Target} = require('../index'); // should be replaced to '@applitools/eyes.webdriverio'
const {BrowserType, SeleniumConfiguration, DeviceName, ScreenOrientation} = require('@applitools/eyes-selenium');

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

  // Initialize the eyes SDK and set your private API key.
  const eyes = new Eyes(true);
  // eyes.setApiKey('Your API Key');
  eyes.setApiKey('97ELuwdIiAilbeumIilysV8yY24tygCeRFFTYEBO7EfE110');

  try {
    const configuration = new SeleniumConfiguration();
    configuration.appName = 'Eyes Examples';
    configuration.testName = 'My first Javascript test!';
    configuration.addBrowser(1200, 800, BrowserType.CHROME);
    configuration.addBrowser(1200, 800, BrowserType.FIREFOX);
    configuration.addDevice(DeviceName.iPhone_4, ScreenOrientation.PORTRAIT);
    eyes.configuration = configuration;

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
