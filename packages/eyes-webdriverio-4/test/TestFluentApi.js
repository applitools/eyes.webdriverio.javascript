'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');
const {By, Target} = require('../index');
const {
  FloatingMatchSettings,
  Region,
  AccessibilityLevel,
  AccessibilityRegionByRectangle,
  AccessibilityRegionType
} = require('@applitools/eyes-sdk-core');


shared.examplesFor('TestFluentApi', function (test) {

  it.skip('TestCheckWindowWithIgnoreRegion_Fluent', async () => {
    const element = await test.eyes.getDriver().webDriver.findElement(By.tagName('input'));
    await element.sendKeys('My Input');
    await test.eyes.check('Fluent - Window with Ignore region', Target.window()
      .fully()
      .timeout(5000)
      .ignore(new Region(50, 50, 100, 100)));
  });

  it('TestCheckRegionWithIgnoreRegion_Fluent', async () => {
    await test.eyes.check("Fluent - Region with Ignore region", Target.region(By.id("overflowing-div"))
      .ignore(new Region(50, 50, 100, 100)));
  });

  it.skip('TestCheckFrame_Fully_Fluent', async () => {
    await test.eyes.check("Fluent - Full Frame", Target.frame("frame1").fully());
  });

  it.only('TestCheckFrame_Fluent', async () => {
    await test.eyes.check("Fluent - Frame", Target.frame("frame1"));
  });

  it.skip('TestCheckFrameInFrame_Fully_Fluent', async () => {
    await test.eyes.check("Fluent - Full Frame in Frame", Target.frame("frame1").frame("frame1-1").fully());
  });

  it.skip('TestCheckRegionInFrame_Fluent', async () => {
    await test.eyes.check('Fluent - Region in Frame', Target.frame('frame1')
      .region(By.id('inner-frame-div'))
      .fully());
  });

  it.skip('TestCheckRegionInFrameInFrame_Fluent', async () => {
    await test.eyes.check('Fluent - Region in Frame in Frame', Target.frame('frame1')
      .frame('frame1-1')
      .region(By.tagName('img'))
      .fully());
  });

  it.skip('TestScrollbarsHiddenAndReturned_Fluent', async () => {
    await test.eyes.check('Fluent - Window (Before)', Target.window().fully());
    await test.eyes.check('Fluent - Inner frame div', Target.frame('frame1').region(By.id('inner-frame-div')).fully());
    await test.eyes.check('Fluent - Window (After)', Target.window().fully());
  });

  it.skip('TestCheckRegionInFrame2_Fluent', async () => {
    const result1 = await test.eyes.check("Fluent - Inner frame div 1", Target.frame("frame1")
      .region(By.id("inner-frame-div"))
      .fully()
      .timeout(5000)
      .ignore(new Region(50, 50, 100, 100)));

    const result2 = await test.eyes.check("Fluent - Inner frame div 2", Target.frame("frame1")
      .region(By.id("inner-frame-div"))
      .fully()
      .ignore(new Region(50, 50, 100, 100))
      .ignore(new Region(70, 170, 90, 90)));

    const result3 = await test.eyes.check("Fluent - Inner frame div 3", Target.frame("frame1")
      .region(By.id("inner-frame-div"))
      .fully()
      .timeout(5000));

    const result4 = await test.eyes.check("Fluent - Inner frame div 4", Target.frame("frame1")
      .region(By.id("inner-frame-div"))
      .fully());

    const result5 = await test.eyes.check("Fluent - Full frame with floating region", Target.frame("frame1")
      .fully()
      .layout()
      .floating(new Region(200, 200, 150, 150), 25));
    equal(result1.getAsExpected() && result2.getAsExpected() && result3.getAsExpected() && result4.getAsExpected() && result5.getAsExpected(), true);
  });

  it('TestCheckFrameInFrame_Fully_Fluent2', async () => {
    await test.eyes.check("Fluent - Window with Ignore region 2", Target.window().fully());
    // const result2 = await test.eyes.check("Fluent - Full Frame in Frame 2", Target.frame("frame1").frame("frame1-1").fully());
    // equal(result1.getAsExpected() && result2.getAsExpected(), true);
  });

  it('TestCheckWindowWithIgnoreBySelector_Fluent', async () => {
    await test.eyes.check('Fluent - Window with ignore region by selector',
      Target.window().ignore(By.id('overflowing-div')));
  });

  it('TestCheckWindowWithFloatingBySelector_Fluent', async () => {
    await test.eyes.check('Fluent - Window with floating region by selector',
      Target.window().floating(By.id('overflowing-div'), 3, 3, 20, 30));
  });

  it('TestCheckWindowWithFloatingByRegion_Fluent', async () => {
    const settings = Target.window().floating(new Region(10, 10, 20, 20), 3, 3, 20, 30);
    await test.eyes.check("Fluent - Window with floating region by region", settings);
  });

  it('TestCheckElementFully_Fluent', async () => {
    const webElement = await test.eyes.getDriver().webDriver.findElement(By.id('overflowing-div-image'));
    await test.eyes.check('Fluent - Region by element - fully', Target.region(webElement).fully());
  });

  it('TestCheckElementWithIgnoreRegionByElementOutsideTheViewport_Fluent', async () => {
    const element = await test.eyes.getDriver().webDriver.findElement(By.id('overflowing-div-image'));
    const ignoreElement = await test.eyes.getDriver().webDriver.findElement(By.id('overflowing-div'));
    await test.eyes.check("Fluent - Region by element - fully", Target.region(element).ignore(ignoreElement));
  });

  it('TestCheckElementWithIgnoreRegionBySameElement_Fluent', async () => {
    const webElement = await test.eyes.getDriver().webDriver.findElement(By.id('overflowing-div-image'));
    await test.eyes.check("Fluent - Region by element", Target.region(webElement).ignore(webElement));
  });

  it('TestCheckFullWindowWithMultipleIgnoreRegionsBySelector_Fluent', async () => {
    await test.eyes.check('Fluent - Region by element', Target.window().fully().ignore(By.cssSelector('.ignore')));
  });

  it.skip('TestCheckMany', async () => {
    //todo need to implement according to java3
    await test.eyes.check(
      Target.region(By.id("overflowing-div-image")).withName("overflowing div image"),
      Target.region(By.id("overflowing-div")).withName("overflowing div"),
      Target.region(By.id("overflowing-div-image")).fully().withName("overflowing div image (fully)"),
      Target.frame("frame1").frame("frame1-1").fully().withName("Full Frame in Frame"),
      Target.frame("frame1").withName("frame1"),
      Target.region(new Region(30, 50, 300, 620)).withName("rectangle")
    );
  });

  it.skip('TestAccessibilityRegions', async () => {
    const configuration = test.eyes.getConfiguration();
    configuration.setApiKey(process.env.APPLITOOLS_FABRIC_API_KEY);
    configuration.setServerUrl('https://eyesfabric4eyes.applitools.com');
    configuration.setAccessibilityValidation(AccessibilityLevel.AAA);
    test.eyes.setConfiguration(configuration);

    await test.eyes.check('Main Page', Target.window().accessibilityRegion(By.css('.ignore'), AccessibilityRegionType.LargeText));

    // test.setExpectedAccessibilityRegions(
    //   new AccessibilityRegionByRectangle(new Region(122, 928, 456, 306), AccessibilityRegionType.LargeText),
    //   new AccessibilityRegionByRectangle(new Region(8, 1270, 690, 206), AccessibilityRegionType.LargeText),
    //   new AccessibilityRegionByRectangle(new Region(10, 284, 800, 500), AccessibilityRegionType.LargeText)
    // );

    // test.addExpectedProperty('AccessibilityLevel', AccessibilityLevel.AAA);

  });
});

module.exports.TestFluentApi = shared;
