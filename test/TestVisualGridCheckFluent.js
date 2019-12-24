'use strict';

const chromedriver = require('chromedriver');
const webdriverio = require('webdriverio');
const {ConsoleLogHandler, Region, BrowserType, Configuration} = require('@applitools/eyes-sdk-core');
const {By, Eyes, Target, VisualGridRunner} = require('../index');
const Common = require('./Common');

let browser, /** @type {Eyes} */ eyes;
describe('VisualGridCheckFluent', function () {
  this.timeout(5 * 60 * 1000);

  before(async function () {
    chromedriver.start();

    const chrome = Common.CHROME;
    browser = webdriverio.remote({...chrome, port: 9515, path: '/'});
    await browser.init();

    eyes = new Eyes(new VisualGridRunner(3));
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    // eyes.setProxy('http://localhost:8000');

    if (process.env.APPLITOOLS_SHOW_LOGS) {
      eyes.setLogHandler(new ConsoleLogHandler(true));
    }

    await browser.url('http://applitools.github.io/demo/TestPages/FramesTestPage/');
  });

  beforeEach(async function () {
    const configuration = new Configuration();
    configuration.setAppName(this.test.parent.title);
    configuration.setTestName(this.currentTest.title);
    configuration.addBrowser(1200, 800, BrowserType.CHROME);
    configuration.addBrowser(1200, 800, BrowserType.FIREFOX);

    eyes.setConfiguration(configuration);

    browser = await eyes.open(browser);
  });

  afterEach(async function () {
    return eyes.abortIfNotClosed();
  });

  after(async function () {
    await browser.end();
    chromedriver.stop();
  });

  it('TestCheckWindow', async function () {
    await eyes.check('Window', Target.window());
    return eyes.close();
  });

  it('TestCheckWindowFully', async function () {
    await eyes.check('Full Window', Target.window().fully());
    return eyes.close();
  });

  it('TestCheckRegion', async function () {
    await eyes.check('Region by selector', Target.region(By.id('overflowing-div')).ignoreRegions(new Region(50, 50, 100, 100)));
    return eyes.close();
  });

  it('TestCheckRegionFully', async function () {
    await eyes.check('Region Fully', Target.region(By.id('overflowing-div-image')).fully());
    return eyes.close();
  });

  // it('TestCheckFrame', async function () {
  //   await eyes.check('Frame', Target.frame('frame1'));
  //   return eyes.close();
  // });

  // it('TestCheckFrameFully', async function () {
  //   await eyes.check('Full Frame', Target.frame('frame1').fully());
  //   return eyes.close();
  // });

  // it('TestCheckRegionInFrame', async function () {
  //   await eyes.check('Region in Frame', Target.frame('frame1').region(By.id('inner-frame-div')).fully());
  //   return eyes.close();
  // });

});
