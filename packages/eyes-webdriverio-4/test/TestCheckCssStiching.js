'use strict';

const chromedriver = require('chromedriver');
const {remote} = require('webdriverio');
const {Eyes, StitchMode, ConsoleLogHandler, Target} = require('../index');

const Common = require('./Common');

let browser, eyes;

describe('TestCheckCssStitching', function () {
  this.timeout(5 * 60 * 1000);

  before(async function () {
    chromedriver.start();

    eyes = new Eyes();
    eyes.setLogHandler(new ConsoleLogHandler(false));
    eyes.setStitchMode(StitchMode.CSS);
  });

  beforeEach(async () => {
    const chrome = Common.CHROME;
    browser = remote(chrome);
    await browser.init();
    const driver = await eyes.open(browser, 'AppName', 'TestName', {width: 600, height: 500});
    await driver.url('https://applitools.github.io/demo/TestPages/FramesTestPage/');
  });

  afterEach(async () => {
    await browser.end();
    await eyes.abort();
  });

  after(async function () {
    chromedriver.stop();
  });

  it('TestCheckWindow', async () => {
    await eyes.check('Window', Target.window().fully());
    return eyes.close();
  });

});
