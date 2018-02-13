'use strict';

const {equal} = require('assert');
const {By, Target} = require('../index');
const Common = require('./lib/Common');


const appName = 'Wix';
const testedPageUrl = 'https://eventstest.wixsite.com/events-page-e2e/events/ba837913-7dad-41b9-b530-6c2cbfc4c265';


const test = new Common({testedPageUrl});


describe(appName, function () {

  before(function () {
    test.beforeTest({batchName: 'Wix Example'});
    test.eyes.setMatchTimeout(0);
  });

  beforeEach(async function () {
    const chrome = {
      desiredCapabilities: {
        browserName: 'chrome',
        chromeOptions: {
          args: [
            'test-type',
            'start-maximized',
            'disable-popup-blocking',
            'disable-infobars'
          ]
        }
      }
    };

    await test.beforeEachTest({
      appName: appName,
      testName: 'Wix Example',
      browserOptions: chrome,
      rectangleSize: null
    });
  });

  afterEach(async function () {
    await test.afterEachTest();
  });


  it('Wix Example', async function () {
    const iFrameID = "TPAMultiSection_j5ocg4p8iframe";

    //Switch to frame
    const driver = test.eyes.getDriver();
    await driver.switchTo().frame(iFrameID);

    //click register button
    const rb = await driver.findElement(By.cssSelector("[data-hook=get-tickets-button]"));
    rb.click();

    //add one ticket
    const ot = await driver.findElement(By.cssSelector("[data-hook=plus-button]"));
    ot.click();

    //just an example, where it make us some problems with scrolling to top of the frame.
    //eyes.checkRegion(By.cssSelector("[data-hook=plus-button]"));
    await test.eyes.check("", Target.region(By.cssSelector("[data-hook=plus-button]")));
  });

});
