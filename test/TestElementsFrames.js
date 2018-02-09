'use strict';

const {equal} = require('assert');
const {By} = require('../index');
const Common = require('./lib/Common');


const appName = 'Eyes Selenium SDK';


const test = new Common({});


describe(appName, function () {

  before(function () {
    test.beforeTest({batchName: 'WIX like test', fps: true});
  });

  beforeEach(async function () {
    const chrome = {
      desiredCapabilities: {
        browserName: 'chrome',
        chromeOptions: {
          args: [
            '--force-device-scale-factor=1.25'
          ]
        }
      }
    };
    await test.beforeEachTest({
      appName: appName,
      testName: this.currentTest.title,
      browserOptions: chrome
    });
  });

  afterEach(async function () {
    await test.afterEachTest();
  });


  xit('home1', async function () {
    test.browser.get('https://astappev.github.io/test-html-pages/');
    let result;

    result = await test.eyes.checkWindow('Initial');
    equal(result.asExpected, true);

    result = await test.eyes.checkRegion(By.id('overflowing-div'), 'Initial', true);
    equal(result.asExpected, true);

    result = await test.eyes.checkRegionInFrame('frame1', By.id('inner-frame-div'), 'Inner frame div', true);
    equal(result.asExpected, true);

    result = await test.eyes.checkRegion(By.id('overflowing-div-image'), 'minions', true);
    equal(result.asExpected, true);
  });

  xit('playbuzz', async function () {
    test.browser.get('http://alpha.playbuzz.com/plabuzz1010/automation-test-story-default');
    await test.browser.findElement(By.cssSelector('#pb-story > pb-story > div > div.bottom-share-bar-container.ng-scope.ng-isolate-scope > button')).click();
    const result = await test.eyes.checkRegion(By.cssSelector('body > div.modal.fade.ng-isolate-scope.embed-modal.in > div > div'));
    equal(result.asExpected, true);
  });

});
