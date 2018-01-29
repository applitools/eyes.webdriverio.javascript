'use strict';

// const test = require('ava');
const webdriverio = require('webdriverio');
const {By, Eyes, StitchMode} = require('../index');
const {ConsoleLogHandler, RectangleSize} = require('eyes.sdk');

const assert = require('assert');


const appName = 'Eyes Selenium SDK - Classic API - ForceFPS';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';

const options = {
  desiredCapabilities: {
    browserName: 'firefox'
  }
};

let driver;
let browser;

let eyes;


describe(appName, function () {

  before(function () {
    eyes = new Eyes();
    eyes.setApiKey(process.env.API_KEY);
    eyes.setLogHandler(new ConsoleLogHandler(true));

    eyes.setForceFullPageScreenshot(true);
    eyes.setStitchMode(StitchMode.CSS);
    eyes.setHideScrollbars(true);

    eyes.setBatch(appName);

    // eyes.setSaveDebugScreenshots(true);
  });

  beforeEach(async function () {
    driver = webdriverio.remote(options);
    browser = driver.init();
    const testName = this.currentTest.title;
    await eyes.open(browser, appName, testName, new RectangleSize(800, 600));
    await browser.url(testedPageUrl);
  });

  afterEach(async function () {
    try {
      await eyes.close();
    } finally {
      await browser.end();
      await eyes.abortIfNotClosed();
    }
  });

  xit('TestCheckWindow', async function () {
    const result = await eyes.checkWindow('Window');
    assert.equal(result.asExpected, true);
  });

  it('TestCheckRegion', async function () {
    const result = await eyes.checkRegionBy(By.id('overflowing-div'), 'Region');
    assert.equal(result.asExpected, true);
  });

  it('TestCheckFrame', async function () {
    const result = await eyes.checkFrame('frame1', null, 'frame1');
    assert.equal(result.asExpected, true);
  });

  it('TestCheckRegionInFrame', async function () {
    const result = await  eyes.checkRegionInFrame('frame1', By.id('inner-frame-div'), null, 'Inner frame div', true);
    assert.equal(result.asExpected, true);
  });

  it('TestCheckRegion2', async function () {
    const result = await  eyes.checkRegionBy(By.id('overflowing-div-image'), 'minions');
    assert.equal(result.asExpected, true);
  });

});
