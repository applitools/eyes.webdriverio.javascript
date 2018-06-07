'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');


shared.examplesFor('TestMobile', function (test) {

  it('TestCheckWindow', function () {
    return test.eyes.checkWindow('Window').then(result => {
      equal(result.getAsExpected(), true);
    });
  });

});

module.exports.TestSpecialCases = shared;
