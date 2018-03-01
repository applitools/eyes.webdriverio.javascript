'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');
const {By} = require('../index');


shared.examplesFor('TestClassicApi', function (test) {
  it('TestCheckWindow', async function () {
    const result = await test.eyes.checkWindow('Window');
    equal(result.asExpected, true);
  });

  it('TestCheckRegion', async function () {
    const result = await test.eyes.checkRegionBy(By.id('overflowing-div'), 'Region');
    equal(result.asExpected, true);
  });

  it('TestCheckFrame', async function () {
    const result = await test.eyes.checkFrame('frame1', null, 'frame1');
    equal(result.asExpected, true);
  });

  it('TestCheckRegionInFrame', async function () {
    const result = await test.eyes.checkRegionInFrame('frame1', By.id('inner-frame-div'), null, 'Inner frame div', true);
    equal(result.asExpected, true);
  });

  it('TestCheckRegion2', async function () {
    const result = await test.eyes.checkRegionBy(By.id('overflowing-div-image'), 'minions');
    equal(result.asExpected, true);
  });
});

module.exports.TestClassicApi = shared;
