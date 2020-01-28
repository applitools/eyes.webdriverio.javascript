'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');
const {By} = require('../index');


shared.examplesFor('TestClassicApi', function (test) {
  it('TestCheckWindow', async () => {
    await test.eyes.checkWindow('Window');
  });

  it('TestCheckRegion', async () => {
    await test.eyes.checkRegionBy(By.id('overflowing-div'), 'Region');
  });

  it.skip('TestCheckFrame', async () => {
    await test.eyes.checkFrame('frame1', null, 'frame1');
  });

  it.skip('TestCheckRegionInFrame', async () => {
    await test.eyes.checkRegionInFrame('frame1', By.id('inner-frame-div'), null, 'Inner frame div', true);
  });

  it('TestCheckRegion2', async () => {
    await test.eyes.checkRegionBy(By.id('overflowing-div-image'), 'minions');
  });

  it.skip('TestCheckInnerFrame', async () => {
    await test.eyes.getDriver().switchTo().defaultContent();
    const frame = await test.eyes.getDriver().webDriver.findElement(By.name('frame1'));
    await test.eyes.getDriver().switchTo().frame(frame);
    await test.eyes.checkFrame('frame1-1', 'inner-frame');
  });

  it('TestIgnoreCaret', async () => {
    test.eyes.setIgnoreCaret(true);
    const input = await test.eyes.getDriver().webDriver.findElement(By.xPath('/html/body/input'));
    await input.sendKeys('test');

    await test.eyes.checkRegionBy(By.xPath('/html/body/input'), 'input');
  });
});

module.exports.TestClassicApi = shared;
