'use strict';

const {TestClassicApi} = require('./TestClassicApi');
const Common = require('./Common');


const appName = 'Eyes Selenium SDK - Classic API';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';


const test = new Common({testedPageUrl});


describe(appName, function () {

  before(function () {
    test.beforeTest({});
  });

  beforeEach(async function () {
    const browserOptions = Common.CHROME;
    await test.beforeEachTest({
      appName: appName,
      testName: this.currentTest.title,
      browserOptions: browserOptions,
      test: this
    });
  });

  afterEach(async function () {
    try {
      await test.afterEachTest();
    } catch (ignored) {
    }
  });

  after(async function () {
  });

  TestClassicApi.shouldBehaveLike('TestClassicApi', test);

});
