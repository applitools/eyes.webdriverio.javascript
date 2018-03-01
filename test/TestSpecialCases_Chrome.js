'use strict';

const {TestSpecialCases} = require('./TestSpecialCases');
const Common = require('./Common');


const appName = 'Eyes Selenium SDK - Special Cases';
const testedPageUrl = 'http://applitools.github.io/demo/TestPages/WixLikeTestPage/index.html';


const test = new Common({testedPageUrl});


describe.skip(appName, function () {

  before(function () {
    test.beforeTest({});
  });

  beforeEach(async function () {
    await test.beforeEachTest({appName: appName, testName: this.currentTest.title, browserOptions: Common.CHROME});
  });

  afterEach(async function () {
    await test.afterEachTest();
  });


  TestSpecialCases.shouldBehaveLike('TestSpecialCases', test);

});
