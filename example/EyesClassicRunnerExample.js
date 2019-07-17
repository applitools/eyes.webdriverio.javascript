'use strict';

const chromedriver = require('chromedriver');
const {remote} = require('webdriverio');
const {By, ClassicRunner, Eyes, Target, Configuration, BatchInfo} = require('../index'); // should be replaced to '@applitools/eyes.webdriverio'

(async () => {
  chromedriver.start();

  // Open a Chrome browser.
  const chrome = {
    desiredCapabilities: {
      browserName: 'chrome'
    }
  };
  let driver = remote(chrome);
  await driver.init();

  const runner = new ClassicRunner();

  // Initialize the eyes SDK
  const eyes = new Eyes(runner);

  try {
    const batchInfo = new BatchInfo();
    batchInfo.setSequenceName('alpha sequence');

    const configuration = new Configuration();
    configuration.setBatch(batchInfo);
    configuration.setAppName('Eyes Examples');
    configuration.setTestName('My first Javascript test!');
    // set your private API key
    configuration.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setConfiguration(configuration);

    driver = await eyes.open(driver);

    // Navigate the browser to the "hello world!" web-site.
    await driver.url('https://applitools.com/helloworld');

    // Visual checkpoint #1.
    await eyes.check('Main Page', Target.window().fully());

    // Click the "Click me!" button.
    await driver.click(By.cssSelector('button'));

    // Visual checkpoint #2.
    await eyes.check('Click!', Target.window().fully());

    // End the test.
    await eyes.close(false);
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
