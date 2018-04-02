'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');
const {By, Target} = require('../index');


shared.examplesFor('TestSpecialCases', function (test) {

  it('TestCheckRegionInAVeryBigFrame', function () {
    return test.eyes.check('map', Target.frame('frame1').region(By.tagName('img'))).then(result => {
      equal(result.asExpected, true);
    });
  });

  it('TestCheckRegionInAVeryBigFrameAfterManualSwitchToFrame', function () {
    const driver = test.eyes.getDriver();
    return driver.switchTo().frame("frame1").then(() => {
      return test.browser.element('img');
    }).then(r => {
      const {value: element} = r;
      driver.executeScript('arguments[0].scrollIntoView(true);', element);
      return test.eyes.check('', Target.region(By.cssSelector('img')));
    });
  });
});

module.exports.TestSpecialCases = shared;
