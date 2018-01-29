'use strict';

const shared = require('shared-examples-for');
const webdriverio = require('webdriverio');
const {By, Eyes, StitchMode, Target, WebElement} = require('../index');
const {ConsoleLogHandler, FloatingMatchSettings, RectangleSize, Region} = require('eyes.sdk');

const Common = require('./lib/Common');

const {equal} = require('assert');


const testTitle = 'Eyes WDIO SDK - Classic API';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';


let test = new Common({testedPageUrl});


shared.examplesFor('TestFluentApi', function(options) {
  // fixme fail in java version
  xit('TestCheckWindowWithIgnoreRegion_Fluent', async function () {
    const result = await test.eyes.check('Fluent - Window with Ignore region', Target.window()
      .fully()
      .timeout(5000)
      .ignore(new Region(50, 50, 100, 100)));
    equal(result.asExpected, true);
  });

  it('TestCheckRegionWithIgnoreRegion_Fluent', async function () {
    const result = await test.eyes.check("Fluent - Region with Ignore region", Target.region(By.id("overflowing-div"))
      .ignore(new Region(50, 50, 100, 100)));
    equal(result.asExpected, true);
  });

  it('TestCheckFrame_Fully_Fluent', async function () {
    const result = await test.eyes.check("Fluent - Full Frame", Target.frame("frame1").fully());
    equal(result.asExpected, true);
  });

  it('TestCheckFrame_Fluent', async function () {
    const result = await test.eyes.check("Fluent - Frame", Target.frame("frame1"));
    equal(result.asExpected, true);
  });

  it('TestCheckFrameInFrame_Fully_Fluent', async function () {
    const result = await test.eyes.check("Fluent - Full Frame in Frame", Target.frame("frame1")
      .frame("frame1-1")
      .fully());
    equal(result.asExpected, true);
  });

  it('TestCheckRegionInFrame_Fluent', async function () {
    const result = await test.eyes.check('Fluent - Region in Frame', Target.frame('frame1')
      .region(By.id('inner-frame-div'))
      .fully());
    equal(result.asExpected, true);
  });

  it('TestCheckRegionInFrameInFrame_Fluent', async function () {
    const result = await test.eyes.check("Fluent - Region in Frame in Frame", Target.frame("frame1")
      .frame("frame1-1")
      .region(By.tagName("img"))
      .fully());
    equal(result.asExpected, true);
  });

  // fixme fail in java version
  xit('TestCheckFrameInFrame_Fully_Fluent2', async function () {
    let result = await test.eyes.check("Fluent - Window with Ignore region 2", Target.window()
      .fully()
    );
    equal(result.asExpected, true);

    result = await test.eyes.check("Fluent - Full Frame in Frame 2", Target.frame("frame1")
      .frame("frame1-1")
      .fully());
    equal(result.asExpected, true);
  });

  // fixme fail in java version
  xit('TestCheckWindowWithIgnoreBySelector_Fluent', async function () {
    const result = await test.eyes.check('Fluent - Window with ignore region by selector', Target.window()
      .ignore(By.id('overflowing-div')));
    equal(result.asExpected, true);
  });

  // fixme fail in java version
  xit('TestCheckWindowWithFloatingBySelector_Fluent', async function () {
    const result = await test.eyes.check('Fluent - Window with floating region by selector', Target.window()
      .floating(By.id('overflowing-div'), 3, 3, 20, 30));
    equal(result.asExpected, true);
  });

  // todo
  xit('TestCheckWindowWithFloatingByRegion_Fluent', async function () {
    const settings = Target.window().floating(new Region(10, 10, 20, 20), 3, 3, 20, 30);
    await test.eyes.check("Fluent - Window with floating region by region", settings);

    setExpectedFloatingsRegions(new FloatingMatchSettings(10, 10, 20, 20, 3, 3, 20, 30));
  });

  it('TestCheckElementFully_Fluent', async function () {
    const {value: element} = await test.browser.element('#overflowing-div-image');
    const webElement = new WebElement(test.eyes.getDriver(), element);
    let result = await test.eyes.check('Fluent - Region by element - fully', Target.region(webElement).fully());
    equal(result.asExpected, true);
  });

  it('TestCheckElement_Fluent', async function () {
    const {value: element} = await test.browser.element('#overflowing-div-image');
    const webElement = new WebElement(test.eyes.getDriver(), element);
    let result = await test.eyes.check("Fluent - Region by element", Target.region(webElement));
    equal(result.asExpected, true);
  });
});


describe(testTitle, function () {

  describe('Chrome', function () {
    const appName = 'Eyes Selenium SDK - Fluent API';

    before(function () {
      test.beforeTest({appName: appName});
    });

    beforeEach(async function () {
      await test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.CHROME});
    });

    afterEach(async function () {
      await test.afterEachTest();
    });


    shared.shouldBehaveLike('TestFluentApi'); // all arguments after shared example title will be passed to shared example function

  });

  describe('Chrome_FPS', function () {
    const appName = 'Eyes Selenium SDK - Fluent API - ForceFPS';

    before(function () {
      test.beforeTest({appName: appName, fps: true});
    });

    beforeEach(async function () {
      await test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.CHROME});
    });

    afterEach(async function () {
      await test.afterEachTest();
    });


    shared.shouldBehaveLike('TestFluentApi'); // all arguments after shared example title will be passed to shared example function

  });

  describe('Firefox', function () {
    const appName = 'Eyes Selenium SDK - Fluent API';

    before(function () {
      test.beforeTest({appName: appName});
    });

    beforeEach(async function () {
      await test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.FIREFOX});
    });

    afterEach(async function () {
      await test.afterEachTest();
    });


    shared.shouldBehaveLike('TestFluentApi'); // all arguments after shared example title will be passed to shared example function

  });

  describe('Firefox_FPS', function () {
    const appName = 'Eyes Selenium SDK - Fluent API - ForceFPS';

    before(function () {
      test.beforeTest({appName: appName, fps: true});
    });

    beforeEach(async function () {
      await test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.FIREFOX});
    });

    afterEach(async function () {
      await test.afterEachTest();
    });


    shared.shouldBehaveLike('TestFluentApi'); // all arguments after shared example title will be passed to shared example function

  });

});
