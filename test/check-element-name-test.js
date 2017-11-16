import test from 'ava';
import * as webdriverio from 'webdriverio';
import {By, Eyes, ConsoleLogHandler} from '../index';

const {MatchLevel} = require('eyes.sdk');


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
});

test.beforeEach(async (t) => {
  const testName = t.title.replace("beforeEach for ", "");
  await eyes.open(browser, appName, testName, {width: 800, height: 600});
});

test('Check element by name test!', async () => {
  try {
    await browser.url('https://yuriieasternpeak.github.io/webdriver.io-test-html-pages/');

    const defaultMatchSettings = eyes.getDefaultMatchSettings();
    defaultMatchSettings.setMatchLevel(MatchLevel.Exact);
    eyes.setDefaultMatchSettings(defaultMatchSettings);

    const name = 'frame1'; // name
    // const name = 'frame2'; // name
    await eyes.checkElement(By.name(name), null, 'Text block');

    await eyes.close();
  } finally {
    await browser.end();
    await eyes.abortIfNotClosed();
  }
});
