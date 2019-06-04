'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');
const {By} = require('../index');


shared.examplesFor('TestClassicApi', function (test) {
  it('TestCheckWindow', async () => {
    const result = await test.eyes.checkWindow('Window');
    equal(result.getAsExpected(), true);
  });

  it('TestCheckRegion', async () => {
    const result = await test.eyes.checkRegionBy(By.id('overflowing-div'), 'Region');
    equal(result.getAsExpected(), true);
  });

  it('TestCheckFrame', async () => {
    const result = await test.eyes.checkFrame('frame1', null, 'frame1');
    equal(result.getAsExpected(), true);
  });

  it('TestCheckRegionInFrame', async () => {
    const result = await test.eyes.checkRegionInFrame('frame1', By.id('inner-frame-div'), null, 'Inner frame div', true);
    equal(result.getAsExpected(), true);
  });

  it('TestCheckRegion2', async () => {
    const result = await test.eyes.checkRegionBy(By.id('overflowing-div-image'), 'minions');
    equal(result.getAsExpected(), true);
  });

  it.skip('TestCheckInnerFrame', async () => {
    await test.eyes.getDriver().switchTo().defaultContent();
    const frame = await test.eyes.getDriver().webDriver.findElement(By.name('frame1'));
    await test.eyes.getDriver().switchTo().frame(frame);
    const result = await test.eyes.checkFrame('frame1-1', 'inner-frame');
    equal(result.getAsExpected(), true);
  });

  it.skip('TestIgnoreCaret', async () => {
    test.eyes.setIgnoreCaret(true);
    const input = await test.eyes.getDriver().webDriver.findElement(By.xPath('/html/body/input'));
    await input.sendKeys('test');

    const result = await test.eyes.checkRegionBy(By.xPath('/html/body/input'), 'input');
    equal(result.getAsExpected(), true);
  });
});

module.exports.TestClassicApi = shared;
