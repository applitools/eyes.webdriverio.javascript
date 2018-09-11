'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');
const {By, Target, WebElement} = require('../index');
const {FloatingMatchSettings, Region} = require('@applitools/eyes.sdk.core');


shared.examplesFor('TestFluentApi', function (test) {

  it.skip('TestCheckWindowWithIgnoreRegion_Fluent', function () {
    return test.eyes.getDriver().webDriver.findElement(By.tagName('input')).then(element => {
      return element.sendKeys('My Input');
    }).then(() => {
      return test.eyes.check('Fluent - Window with Ignore region', Target.window()
        .fully()
        .timeout(5000)
        .ignore(new Region(50, 50, 100, 100)));
    }).then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckRegionWithIgnoreRegion_Fluent', function () {
    return test.eyes.check("Fluent - Region with Ignore region", Target.region(By.id("overflowing-div"))
      .ignore(new Region(50, 50, 100, 100))).then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckFrame_Fully_Fluent', function () {
    return test.eyes.check("Fluent - Full Frame", Target.frame("frame1").fully()).then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckFrame_Fluent', function () {
    return test.eyes.check("Fluent - Frame", Target.frame("frame1")).then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckFrameInFrame_Fully_Fluent', function () {
    return test.eyes.check("Fluent - Full Frame in Frame", Target.frame("frame1")
      .frame("frame1-1")
      .fully()).then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckRegionInFrame_Fluent', function () {
    return test.eyes.check('Fluent - Region in Frame', Target.frame('frame1')
      .region(By.id('inner-frame-div'))
      .fully()).then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckRegionInFrameInFrame_Fluent', function () {
    return test.eyes.check('Fluent - Region in Frame in Frame', Target.frame('frame1')
      .frame('frame1-1')
      .region(By.tagName('img'))
      .fully()).then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it.skip('TestScrollbarsHiddenAndReturned_Fluent', function () {
    //todo need to implement according to java3
/*
    eyes.check("Fluent - Window (Before)", Target.window().fully());
    eyes.check("Fluent - Inner frame div",
      Target.frame("frame1")
        .region(By.id("inner-frame-div"))
        .fully());
    eyes.check("Fluent - Window (After)", Target.window().fully());
*/
  });

  it.skip('TestCheckRegionInFrame2_Fluent', function () {
    //todo need to implement according to java3
/*
        eyes.check("Fluent - Inner frame div 1", Target.frame("frame1")
                .region(By.id("inner-frame-div"))
                .fully()
                .timeout(5000)
                .ignore(new Region(50, 50, 100, 100)));

        eyes.check("Fluent - Inner frame div 2", Target.frame("frame1")
                .region(By.id("inner-frame-div"))
                .fully()
                .ignore(new Region(50, 50, 100, 100))
                .ignore(new Region(70, 170, 90, 90)));

        eyes.check("Fluent - Inner frame div 3", Target.frame("frame1")
                .region(By.id("inner-frame-div"))
                .fully()
                .timeout(5000));

        eyes.check("Fluent - Inner frame div 4", Target.frame("frame1")
                .region(By.id("inner-frame-div"))
                .fully());

        eyes.check("Fluent - Full frame with floating region", Target.frame("frame1")
                .fully()
                .layout()
                .floating(25, new Region(200, 200, 150, 150)));
*/
  });

  it('TestCheckFrameInFrame_Fully_Fluent2', function () {
    let result;
    return test.eyes.check("Fluent - Window", Target.window().fully()).then(result_ => {
      result = result_;

      return test.eyes.check("Fluent - Full Frame in Frame 2", Target.frame("frame1").frame("frame1-1").fully());
    }).then(result_ => {
      equal(result.getAsExpected() && result_.getAsExpected(), true);
    });
  });

  it('TestCheckWindowWithIgnoreBySelector_Fluent', function () {
    return test.eyes.check('Fluent - Window with ignore region by selector', Target.window().ignore(By.id('overflowing-div'))).then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckWindowWithFloatingBySelector_Fluent', function () {
    return test.eyes.check('Fluent - Window with floating region by selector', Target.window().floating(By.id('overflowing-div'), 3, 3, 20, 30)).then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckWindowWithFloatingByRegion_Fluent', function () {
    const settings = Target.window().floating(new Region(10, 10, 20, 20), 3, 3, 20, 30);
    return test.eyes.check("Fluent - Window with floating region by region", settings).then(result => {
      equal(result.getAsExpected(), true);
      test.setExpectedFloatingsRegions(new FloatingMatchSettings(10, 10, 20, 20, 3, 3, 20, 30));
    });
  });

  it('TestCheckElementFully_Fluent', function () {
    return test.eyes.getDriver().webDriver.findElement(By.id('overflowing-div-image')).then(webElement => {
      return test.eyes.check('Fluent - Region by element - fully', Target.region(webElement).fully());
    }).then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckElementWithIgnoreRegionByElementOutsideTheViewport_Fluent', function () {
    let element;
    return test.eyes.getDriver().webDriver.findElement(By.id('overflowing-div-image')).then(element_ => {
      element = element_;
      return test.eyes.getDriver().webDriver.findElement(By.id('overflowing-div'));
    }).then(ignoreElement => {
      return test.eyes.check("Fluent - Region by element - fully", Target.region(element).ignore(ignoreElement))
    }).then(result => {
      equal(result.getAsExpected(), true);
      test.setExpectedIgnoreRegions(new Region(0, -202, 304, 184));
    });
  });

  it('TestCheckElementWithIgnoreRegionBySameElement_Fluent', function () {
    return test.eyes.getDriver().webDriver.findElement(By.id('overflowing-div-image')).then(webElement => {
      return test.eyes.check("Fluent - Region by element", Target.region(webElement).ignore(webElement));
    }).then(result => {
      equal(result.getAsExpected(), true);
      test.setExpectedIgnoreRegions(new Region(0, 0, 304, 184));
    });
  });

  it.skip('TestCheckFullWindowWithMultipleIgnoreRegionsBySelector_Fluent', function () {
    //todo need to implement according to java3
/*
        eyes.check("Fluent - Region by element", Target.window().fully().ignore(By.cssSelector(".ignore")));
        setExpectedIgnoreRegions(
                new Region(172, 928, 456, 306),
                new Region(8, 1270, 784, 206),
                new Region(10, 284, 302, 182)
        );
*/
  });

  it.skip('TestCheckMany', function () {
    //todo need to implement according to java3
/*
        eyes.check(
                Target.region(By.id("overflowing-div-image")).withName("overflowing div image"),
                Target.region(By.id("overflowing-div")).withName("overflowing div"),
                Target.region(By.id("overflowing-div-image")).fully().withName("overflowing div image (fully)"),
                Target.frame("frame1").frame("frame1-1").fully().withName("Full Frame in Frame"),
                Target.frame("frame1").withName("frame1"),
                Target.region(new Region(30, 50, 300, 620)).withName("rectangle")
        );
*/
  });
});

module.exports.TestFluentApi = shared;
