'use strict';

const {equal} = require('assert');
const shared = require('shared-examples-for');
const {Target} = require('../index');


shared.examplesFor('TestDomSending', function (test) {
  it.skip('TestCheckWindow', async () => {
    test.eyes.setSendDom(true);
    const result = await test.eyes.checkWindow('Window');
    test.eyes.setSendDom(false);
    equal(result.getAsExpected(), true);
  });

  it.skip('TestCheckWindow_Fluent', async () => {
    const result = await test.eyes.check("Fluent - Window", Target.window().sendDom());
    equal(result.getAsExpected(), true);
  });

  it.skip('TestBestBuy', async () => {
    const url = 'https://www.bestbuy.com/site/apple-macbook-pro-13-display-intel-core-i5-8-gb-memory-256gb-flash-storage-silver/6936477.p?skuId=6936477%27)&intl=nosplash';
    test._browser.url(url);
    const result = await test.eyes.check('BestBuy Test', Target.window().fully().sendDom());
    equal(result.getAsExpected(), true);
  });

  it('NSA', async () => {
    const url = 'https://nikita-andreev.github.io/applitools/dom_capture.html?aaa';
    test._browser.url(url);
    const result = await test.eyes.check('Window', Target.window().fully().sendDom());
    equal(result.getAsExpected(), true);
  });

  it.skip('TestSendDOM_Booking1', async function () {
    const url = 'https://www.booking.com/searchresults.en-gb.html?label=gen173nr-1FCAEoggJCAlhYSDNYBGhqiAEBmAEuwgEKd2luZG93cyAxMMgBDNgBAegBAfgBC5ICAXmoAgM;sid=ce4701a88873eed9fbb22893b9c6eae4;city=-2600941;from_idr=1&;ilp=1;d_dcp=1';
    test._browser.url(url);
    const result = await test.eyes.check('BestBuy Test', Target.window().fully().sendDom());
    equal(result.getAsExpected(), true);
  });

});

module.exports.TestDomSending = shared;
