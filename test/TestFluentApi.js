'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');
const {By, Target} = require('../index');
const {FloatingMatchSettings, Region} = require('@applitools/eyes.sdk.core');


shared.examplesFor('TestFluentApi', function (test) {

  it.skip('TestCheckWindowWithIgnoreRegion_Fluent', async () => {
    const element = await test.eyes.getDriver().webDriver.findElement(By.tagName('input'));
    await element.sendKeys('My Input');
    const result = await test.eyes.check('Fluent - Window with Ignore region', Target.window()
      .fully()
      .timeout(5000)
      .ignore(new Region(50, 50, 100, 100)));
    equal(result.getAsExpected(), true);
  });

  it('TestCheckRegionWithIgnoreRegion_Fluent', async () => {
    const result = await test.eyes.check("Fluent - Region with Ignore region", Target.region(By.id("overflowing-div"))
      .ignore(new Region(50, 50, 100, 100)));
    equal(result.getAsExpected(), true);
  });

  it('TestCheckFrame_Fully_Fluent', async () => {
    const result = await test.eyes.check("Fluent - Full Frame", Target.frame("frame1").fully());
    equal(result.getAsExpected(), true);
  });

  it('TestCheckFrame_Fluent', async () => {
    const result = await test.eyes.check("Fluent - Frame", Target.frame("frame1"));
    equal(result.getAsExpected(), true);
  });

  it('TestCheckFrameInFrame_Fully_Fluent', async () => {
    const result = await test.eyes.check("Fluent - Full Frame in Frame", Target.frame("frame1")
      .frame("frame1-1")
      .fully());
    equal(result.getAsExpected(), true);
  });

  it('TestCheckRegionInFrame_Fluent', async () => {
    const result = await test.eyes.check('Fluent - Region in Frame', Target.frame('frame1')
      .region(By.id('inner-frame-div'))
      .fully());
    equal(result.getAsExpected(), true);
  });

  it('TestCheckRegionInFrameInFrame_Fluent', async () => {
    const result = await test.eyes.check('Fluent - Region in Frame in Frame', Target.frame('frame1')
      .frame('frame1-1')
      .region(By.tagName('img'))
      .fully());
    equal(result.getAsExpected(), true);
  });

  it('TestCheckFrameInFrame_Fully_Fluent2', async () => {
    let result = await test.eyes.check("Fluent - Window with Ignore region 2", Target.window().fully());
    equal(result.getAsExpected(), true);
    result = await test.eyes.check("Fluent - Full Frame in Frame 2", Target.frame("frame1").frame("frame1-1").fully());
    equal(result.getAsExpected(), true);
  });

  it('TestCheckWindowWithIgnoreBySelector_Fluent', async () => {
    const result = await test.eyes.check('Fluent - Window with ignore region by selector',
      Target.window().ignore(By.id('overflowing-div')));
    equal(result.getAsExpected(), true);
  });

  it('TestCheckWindowWithFloatingBySelector_Fluent', async () => {
    const result = await test.eyes.check('Fluent - Window with floating region by selector',
      Target.window().floating(By.id('overflowing-div'), 3, 3, 20, 30));
    equal(result.getAsExpected(), true);
  });

  it('TestCheckWindowWithFloatingByRegion_Fluent', async () => {
    const settings = Target.window().floating(new Region(10, 10, 20, 20), 3, 3, 20, 30);
    const result = await test.eyes.check("Fluent - Window with floating region by region", settings);
    equal(result.getAsExpected(), true);
    test.setExpectedFloatingsRegions(new FloatingMatchSettings(10, 10, 20, 20, 3, 3, 20, 30));
  });

  it('TestCheckElementFully_Fluent', async () => {
    const webElement = await test.eyes.getDriver().webDriver.findElement(By.id('overflowing-div-image'));
    const result = await test.eyes.check('Fluent - Region by element - fully', Target.region(webElement).fully());
    equal(result.getAsExpected(), true);
  });

  it('TestCheckElementWithIgnoreRegionByElementOutsideTheViewport_Fluent', async () => {
    const element = await test.eyes.getDriver().webDriver.findElement(By.id('overflowing-div-image'));
    const ignoreElement = await test.eyes.getDriver().webDriver.findElement(By.id('overflowing-div'));
    const result = await test.eyes.check("Fluent - Region by element - fully", Target.region(element).ignore(ignoreElement));
    equal(result.getAsExpected(), true);
  });

  it('TestCheckElementWithIgnoreRegionBySameElement_Fluent', async () => {
    const webElement = await test.eyes.getDriver().webDriver.findElement(By.id('overflowing-div-image'));
    const result = await test.eyes.check("Fluent - Region by element", Target.region(webElement).ignore(webElement));
    equal(result.getAsExpected(), true);
    test.setExpectedIgnoreRegions(new Region(0, 0, 304, 184));
  });
});

module.exports.TestFluentApi = shared;
