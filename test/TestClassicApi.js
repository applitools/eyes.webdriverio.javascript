'use strict';

const shared = require('shared-examples-for');

const {By} = require('../index');

const Common = require('./lib/Common');

const assert = require('assert');


const testTitle = 'Eyes WDIO SDK - Classic API';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';


let test = new Common({testedPageUrl});


shared.examplesFor('TestClassicApi', function () {
  // fixme in java first
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


describe(testTitle, function () {

  describe('Chrome', function () {
    const appName = 'Eyes Selenium SDK - Classic API';

    before(function () {
      test.beforeTest({appName: appName});
    });

    beforeEach(async function () {
      await test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.CHROME});
    });

    afterEach(async function () {
      await test.afterEachTest();
    });


    shared.shouldBehaveLike('TestClassicApi'); // all arguments after shared example title will be passed to shared example function

  });

  describe('Chrome_FPS', function () {
    const appName = 'Eyes Selenium SDK - Classic API - ForceFPS';

    before(function () {
      test.beforeTest({appName: appName, fps: true});
    });

    beforeEach(async function () {
      await test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.CHROME});
    });

    afterEach(async function () {
      await test.afterEachTest();
    });


    shared.shouldBehaveLike('TestClassicApi'); // all arguments after shared example title will be passed to shared example function

  });

  describe('Firefox', function () {
    const appName = 'Eyes Selenium SDK - Classic API';

    before(function () {
      test.beforeTest({appName: appName});
    });

    beforeEach(async function () {
      await test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.FIREFOX});
    });

    afterEach(async function () {
      await test.afterEachTest();
    });


    shared.shouldBehaveLike('TestClassicApi'); // all arguments after shared example title will be passed to shared example function

  });

  describe('Firefox_FPS', function () {
    const appName = 'Eyes Selenium SDK - Classic API - ForceFPS';

    before(function () {
      test.beforeTest({appName: appName, fps: true});
    });

    beforeEach(async function () {
      await test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.FIREFOX});
    });

    afterEach(async function () {
      await test.afterEachTest();
    });


    shared.shouldBehaveLike('TestClassicApi'); // all arguments after shared example title will be passed to shared example function

  });

});
