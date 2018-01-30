'use strict';

const assert = require('assert');
const shared = require('shared-examples-for');
const {By} = require('../index');


shared.examplesFor('TestClassicApi', function (test) {
  // fixme in java first
  // chrome fps & ff fps
  xit('TestCheckWindow', async function () {
    const result = await test.eyes.checkWindow('Window');
    assert.equal(result.asExpected, true);
  });

  it('TestCheckRegion', async function () {
    const result = await test.eyes.checkRegionBy(By.id('overflowing-div'), 'Region');
    assert.equal(result.asExpected, true);
  });

  it('TestCheckFrame', async function () {
    const result = await test.eyes.checkFrame('frame1', null, 'frame1');
    assert.equal(result.asExpected, true);
  });

  it('TestCheckRegionInFrame', async function () {
    const result = await test.eyes.checkRegionInFrame('frame1', By.id('inner-frame-div'), null, 'Inner frame div', true);
    assert.equal(result.asExpected, true);
  });

  it('TestCheckRegion2', async function () {
    const result = await test.eyes.checkRegionBy(By.id('overflowing-div-image'), 'minions');
    assert.equal(result.asExpected, true);
  });
});

module.exports.TestClassicApi = shared;
