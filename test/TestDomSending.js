'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');


shared.examplesFor('TestDomSending', function (test) {
  it('TestCheckWindow', function () {
    return test.eyes.checkWindow('Window').then(result => {
      equal(result.getAsExpected(), true);
    });
  });
});

module.exports.TestDomSending = shared;
