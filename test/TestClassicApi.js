'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');
const {By} = require('../index');


shared.examplesFor('TestClassicApi', function (test) {
  it('TestCheckWindow', function () {
    return test.eyes.checkWindow('Window').then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckRegion', function () {
    return test.eyes.checkRegionBy(By.id('overflowing-div'), 'Region').then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckFrame', function () {
    return test.eyes.checkFrame('frame1', null, 'frame1').then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckRegionInFrame', function () {
    return test.eyes.checkRegionInFrame('frame1', By.id('inner-frame-div'), null, 'Inner frame div', true).then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckRegion2', function () {
    return test.eyes.checkRegionBy(By.id('overflowing-div-image'), 'minions').then(result => {
      equal(result.getAsExpected(), true);
    });
  });

  it('TestCheckInnerFrame', function () {
    return test.eyes.getDriver().switchTo().defaultContent().then(() => {
      return test.eyes.getDriver().webDriver.findElement(By.name('frame1'));
    }).then(frame=>{
      return test.eyes.getDriver().switchTo().frame(frame);
    }).then(()=>{
      return test.eyes.checkFrame('frame1-1', 'inner-frame');
    });
  });
});

module.exports.TestClassicApi = shared;
