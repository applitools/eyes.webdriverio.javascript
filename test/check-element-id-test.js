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

test('Check element by id test!', async () => {
  try {
    await browser.url('https://yuriieasternpeak.github.io/webdriver.io-test-html-pages/');

    const defaultMatchSettings = eyes.getDefaultMatchSettings();
    defaultMatchSettings.setMatchLevel(MatchLevel.Exact);
    eyes.setDefaultMatchSettings(defaultMatchSettings);

    const id = '#overflowing-div'; // id
    // const id = '#overflowing-div1'; // id
    await eyes.checkElement(By.id(id), null, 'Text block');

    await eyes.close();
  } finally {
    browser.end();
    eyes.abortIfNotClosed();
  }
});
