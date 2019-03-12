'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');


shared.examplesFor('TestNativeApp', function (test) {

  it('TestCheckWindow', async () => {
    const result = await test.eyes.checkWindow('Window');
    equal(result.getAsExpected(), true);
  });

});

module.exports.TestNativeApp = shared;
