'use strict';

const {TestClassicApi} = require('./TestClassicApi');
const Common = require('./lib/Common');


const appName = 'Eyes Selenium SDK - Classic API - ForceFPS';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';


const test = new Common({testedPageUrl});

describe(appName, function () {

  before(function () {
    test.beforeTest({batchName: appName, fps: true});
  });

  beforeEach(async function () {
    await test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.CHROME});
  });

  afterEach(async function () {
    await test.afterEachTest();
  });


  TestClassicApi.shouldBehaveLike('TestClassicApi', test);

});
