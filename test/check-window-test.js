import test from 'ava';
import * as webdriverio from 'webdriverio';
import {Eyes, ConsoleLogHandler} from '../index';


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

test('Check window test!', async () => {
  try {
    await browser.url('https://applitools.com/helloworld');
    // await browser.url('https://applitools.com/helloworld?diff2');

    await eyes.checkWindow('Main Page');

    await eyes.close();
  } finally {
    await browser.end();
    await eyes.abortIfNotClosed();
  }
});
