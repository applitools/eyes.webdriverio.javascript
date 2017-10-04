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

test.beforeEach(function* (t) {
  const testName = t.title.replace("beforeEach for ", "");
  yield eyes.open(browser, appName, testName, {width: 800, height: 600});
});

test('Check element test!', function* main() {
  try {
    yield browser.url('https://applitools.com/helloworld');
    // yield browser.url('https://applitools.com/helloworld?diff2');

    let elementToCheck = 'body > div > div:nth-child(1)';
    yield eyes.checkElement(elementToCheck, null, 'Header');

    yield eyes.close();
  } finally {
    browser.end();
    eyes.abortIfNotClosed();
  }
});
