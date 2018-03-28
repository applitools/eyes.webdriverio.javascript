'use strict';

const {TestFluentApi} = require('./TestFluentApi');
const Common = require('./Common');


const appName = 'Eyes Selenium SDK - Fluent API - ForceFPS';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/FramesTestPage/';

const test = new Common({testedPageUrl});


describe.skip(appName, function () {

  before(function () {
    test.beforeTest({fps: true});
  });

  beforeEach(async function () {
    await test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.FIREFOX});
  });

  afterEach(async function () {
    await test.afterEachTest();
  });


  TestFluentApi.shouldBehaveLike('TestFluentApi', test);

});
