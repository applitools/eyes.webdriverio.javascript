'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');
const {By, Target} = require('../index');


shared.examplesFor('TestSpecialCases', function (test) {

  it('TestCheckRegionInAVeryBigFrame', async () => {
    const result = await test.eyes.check('map', Target.frame('frame1').region(By.tagName('img')));
    equal(result.getAsExpected(), true);
  });

  it('TestCheckRegionInAVeryBigFrameAfterManualSwitchToFrame', async () => {
    const driver = test.eyes.getDriver();
    await driver.switchTo().frame("frame1");
    const r = await test.browser.element('img');
    const {value: element} = r;
    await driver.executeScript('arguments[0].scrollIntoView(true);', element);
    const result = await test.eyes.check('', Target.region(By.cssSelector('img')));
    equal(result.getAsExpected(), true);
  });
});

module.exports.TestSpecialCases = shared;
