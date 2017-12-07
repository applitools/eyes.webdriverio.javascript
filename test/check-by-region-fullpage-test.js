const test = require('ava');
const webdriverio = require('webdriverio');
const {Target, Eyes, ConsoleLogHandler} = require('../index');
const {MatchLevel, Region} = require('eyes.sdk');


const appName = 'Hello World!';
let driver = null,
  browser = null,
  eyes = null;

test.before(() => {
  const options = {desiredCapabilities: {browserName: 'chrome'}};
  driver = webdriverio.remote(options);
  browser = driver.init();

  eyes = new Eyes();
  eyes.setApiKey(process.env.API_KEY);
  eyes.setLogHandler(new ConsoleLogHandler(true));
  eyes.setForceFullPageScreenshot(true);
});

test.beforeEach(async (t) => {
  const testName = t.title.replace("beforeEach for ", "");
  await eyes.open(browser, appName, testName, {width: 800, height: 600});
});

test('Check region by coordinates (fullscreen)!', async () => {
  try {
    await browser.url('https://yuriieasternpeak.github.io/webdriver.io-test-html-pages/');

    const defaultMatchSettings = eyes.getDefaultMatchSettings();
    defaultMatchSettings.setMatchLevel(MatchLevel.Exact);
    eyes.setDefaultMatchSettings(defaultMatchSettings);

    await eyes.check('Region by coordinates', Target.region(new Region(50, 50, 200, 200)));

    await eyes.close();
  } catch (e) {
    console.error(e);
  } finally {
    await browser.end();
    await eyes.abortIfNotClosed();
  }
});
