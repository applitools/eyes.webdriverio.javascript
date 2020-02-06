'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');
const {Target} = require('../index'); // should be replaced to '@applitools/eyes.webdriverio'


shared.examplesFor('TestMobile', function (test) {

  it('TestCheckWindow', async () => {
    const result = await test.eyes.check('Window', Target.window().fully());
    equal(result.getAsExpected(), true);
  });

});

module.exports.TestMobile = shared;
