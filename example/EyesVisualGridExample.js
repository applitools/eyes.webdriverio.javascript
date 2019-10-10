'use strict';

const chromedriver = require('chromedriver');
const {remote} = require('webdriverio');
const {
  By,
  Eyes,
  Target,
  VisualGridRunner,
  BrowserType,
  Configuration,
  DeviceName,
  ScreenOrientation,
  BatchInfo,
  AccessibilityLevel,
  AccessibilityRegionType,
  Region
} = require('../index'); // should be replaced to '@applitools/eyes.webdriverio'

(async () => {
  chromedriver.start();

  // Open a Chrome browser.
  const chrome = {
    desiredCapabilities: {
      browserName: 'chrome',
      chromeOptions: {
        args: [
          'disable-infobars',
          'headless'
        ]
      }
    }
  };
  let driver = remote(chrome);
  await driver.init();

  // Initialize the eyes SDK
  const eyes = new Eyes(new VisualGridRunner(3));

  try {
    const batchInfo = new BatchInfo();
    batchInfo.setSequenceName('alpha sequence');

    const configuration = new Configuration();
    configuration.setBatch(batchInfo);
    configuration.setAppName('Eyes Examples');
    configuration.setTestName('My first Javascript test!');
    configuration.addBrowser(800, 600, BrowserType.CHROME);
    configuration.addBrowser(500, 400, BrowserType.FIREFOX);
    configuration.addBrowser(500, 400, BrowserType.IE_11);
    configuration.addDeviceEmulation(DeviceName.iPhone_4, ScreenOrientation.PORTRAIT);
    // set your private API key
    configuration.setApiKey(process.env.APPLITOOLS_FABRIC_API_KEY);
    configuration.setServerUrl('https://eyesfabric4eyes.applitools.com');
    // set accessibility validation level
    configuration.setAccessibilityValidation(AccessibilityLevel.AA);
    eyes.setConfiguration(configuration);

    driver = await eyes.open(driver);

    // Navigate the browser to the "hello world!" web-site.
    await driver.url('https://applitools.com/helloworld');

    // Visual checkpoint #1.

    await eyes.check('Main Page', Target.window()
      .accessibilityRegion(By.css('button'), AccessibilityRegionType.RegularText));

    // Click the "Click me!" button.
    await driver.click(By.cssSelector('button'));

    // Visual checkpoint #2.
    await eyes.check('Click!', Target.window());

    // End the test.
    // const results = await eyes.close(); // will return only first TestResults, but as we have two browsers, we need more results
    const results = await eyes.getRunner().getAllTestResults(false);
    console.log(results);
  } catch (e) {
    console.log(`Error ${e}`);
  } finally {
    // Close the browser.
    await driver.end();

    // If the test was aborted before eyes.close was called ends the test as aborted.
    await eyes.abort();

    chromedriver.stop();
  }
})();
