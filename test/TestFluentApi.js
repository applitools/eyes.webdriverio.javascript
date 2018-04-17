'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');
const {By, Target, WebElement} = require('../index');
const {FloatingMatchSettings, Region} = require('@applitools/eyes.sdk.core');


shared.examplesFor('TestFluentApi', function (test) {
  it('TestCheckWindowWithIgnoreRegion_Fluent', function () {
    return test.eyes.getDriver().webDriver.findElement(By.tagName("input")).sendKeys("My Input").then(() => {
      return test.eyes.check('Fluent - Window with Ignore region', Target.window()
        .fully()
        .timeout(5000)
        .ignore(new Region(50, 50, 100, 100))).then(result => {
        equal(result.getAsExpected(), true);
      });
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
    return test.eyes.check("Fluent - Region in Frame in Frame", Target.frame("frame1")
      .frame("frame1-1")
      .region(By.tagName("img"))
      .fully()).then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckFrameInFrame_Fully_Fluent2', function () {
    return test.eyes.check("Fluent - Window with Ignore region 2", Target.window().fully()).then(result => {
      equal(result.getAsExpected(), true);

      return test.eyes.check("Fluent - Full Frame in Frame 2", Target.frame("frame1").frame("frame1-1").fully());
    }).then(result => {
      equal(result.getAsExpected(), true);
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
    return test.browser.element('#overflowing-div-image').then(r_ => {
      const {value: element} = r_;
      const webElement = new WebElement(test.eyes.getDriver(), element);

      return test.eyes.check('Fluent - Region by element - fully', Target.region(webElement).fully());
    }).then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckElementWithIgnoreRegionByElement_Fluent', function () {
    let element;
    return test.eyes.getDriver().webDriver.findElement(By.id('overflowing-div-image')).then(element_ => {
      element = element_;
      return test.eyes.getDriver().webDriver.findElement(By.id('overflowing-div'));
    }).then(ignoreElement => {
      return test.eyes.check("Fluent - Region by element - fully", Target.region(element).ignore(ignoreElement))
    }).then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckElement_Fluent', function () {
    return test.browser.element('#overflowing-div-image').then(r_ => {
      const {value: element} = r_;
      const webElement = new WebElement(test.eyes.getDriver(), element);
      return test.eyes.check("Fluent - Region by element", Target.region(webElement));
    }).then(result => {
      equal(result.getAsExpected(), true);
    });
  });
});

module.exports.TestFluentApi = shared;
