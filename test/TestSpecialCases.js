'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');
const {By, Target} = require('../index');


shared.examplesFor('TestSpecialCases', function (test) {

  it('TestCheckRegionInAVeryBigFrame', async function () {
    const result = await test.eyes.check('map', Target.frame('frame1').region(By.tagName('img')));
    equal(result.asExpected, true);
  });

  it('TestCheckRegionInAVeryBigFrameAfterManualSwitchToFrame', async function () {
    const driver = test.eyes.getDriver();
    await driver.switchTo().frame("frame1");

    const {value: element} = await test.browser.element('img');
    driver.executeScript('arguments[0].scrollIntoView(true);', element);

    await test.eyes.check('', Target.region(By.cssSelector('img')));
  });
});

module.exports.TestSpecialCases = shared;
