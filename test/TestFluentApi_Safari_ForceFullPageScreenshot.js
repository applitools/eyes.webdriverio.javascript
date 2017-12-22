'use strict';

// const test = require('ava');
const webdriverio = require('webdriverio');
const {By, Eyes, StitchMode, Target, WebElement} = require('../index');
const {ConsoleLogHandler, RectangleSize} = require('eyes.sdk');

const assert = require('assert');


const appName = 'Eyes Selenium SDK - Fluent API';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';

const options = {
  desiredCapabilities: {
    browserName: 'safari'
  }
};

const driver = webdriverio.remote(options);
const browser = driver.init();

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
    const testName = this.currentTest.title;
    await eyes.open(browser, appName, testName, new RectangleSize(800, 600));
    await browser.url(testedPageUrl);
  });

  afterEach(async function () {
    await eyes.close();
  });

  after(async function () {
    await browser.end();
    await eyes.abortIfNotClosed();
  });

  it('TestCheckWindowWithIgnoreRegion_Fluent', async function () {
    const result = await eyes.check("Fluent - Window with Ignore region", Target.window()
      .fully()
      .timeout(5000)
      .ignore(new Region(50, 50, 100, 100)));
    assert.equal(result.asExpected, true);
  });

  it('TestCheckRegionWithIgnoreRegion_Fluent', async function () {
    const result = await eyes.check("Fluent - Region with Ignore region", Target.region(By.id("overflowing-div"))
      .ignore(new Region(50, 50, 100, 100)));
    assert.equal(result.asExpected, true);
  });

  xit('TestCheckFrame_Fully_Fluent', async function () {
    const result = await eyes.check("Fluent - Full Frame", Target.frame("frame1").fully());
    assert.equal(result.asExpected, true);
  });

  xit('TestCheckFrame_Fluent', async function () {
    const result = await eyes.check("Fluent - Frame", Target.frame("frame1"));
    assert.equal(result.asExpected, true);
  });

  xit('TestCheckFrameInFrame_Fully_Fluent', async function () {
    const result = await eyes.check("Fluent - Full Frame in Frame", Target.frame("frame1")
      .frame("frame1-1")
      .fully());
    assert.equal(result.asExpected, true);
  });

  xit('TestCheckRegionInFrame_Fluent', async function () {
    const result = await eyes.check("TestCheckRegionInFrame_Fluent", Target.frame("frame1")
      .frame("frame1-1")
      .fully());
    assert.equal(result.asExpected, true);
  });

  xit('TestCheckRegionInFrameInFrame_Fluent', async function () {
    const result = await eyes.check("Fluent - Region in Frame in Frame", Target.frame("frame1")
      .frame("frame1-1")
      .region(By.tagName("img"))
      .fully());
    assert.equal(result.asExpected, true);
  });

  xit('TestCheckFrameInFrame_Fully_Fluent2', async function () {
    let result = await eyes.check("Fluent - Window with Ignore region 2", Target.window()
      .fully()
    );
    assert.equal(result.asExpected, true);

    result = await eyes.check("Fluent - Full Frame in Frame 2", Target.frame("frame1")
      .frame("frame1-1")
      .fully());
    assert.equal(result.asExpected, true);
  });

  it('TestCheckWindowWithIgnoreBySelector_Fluent', async function () {
    const result = await eyes.check('Fluent - Window with ignore region by selector', Target.window()
      .ignore(By.id('overflowing-div')));
    assert.equal(result.asExpected, true);
  });

  it('TestCheckWindowWithFloatingBySelector_Fluent', async function () {
    const result = await eyes.check('Fluent - Window with floating region by selector', Target.window()
      .floating(By.id('overflowing-div'), 3, 3, 20, 30));
    assert.equal(result.asExpected, true);
  });

  it('TestCheckElementFully_Fluent', async function () {
    const element = browser.element('#overflowing-div-image');
    const webElement = new WebElement(eyes.getDriver(), element);
    let result = await eyes.check('Fluent - Region by element - fully', Target.region(webElement).fully());
    assert.equal(result.asExpected, true);
  });

  it('TestCheckElement_Fluent', async function () {
    const element = browser.element('#overflowing-div-image');
    const webElement = new WebElement(eyes.getDriver(), element);
    let result = await eyes.check("Fluent - Region by element", Target.region(webElement));
    assert.equal(result.asExpected, true);
  });

});
