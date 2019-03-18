'use strict';

const chromedriver = require('chromedriver');
const webdriverio = require('webdriverio');
const {BatchInfo, Region, CorsIframeHandle} = require('@applitools/eyes-sdk-core');
const {BrowserType, SeleniumConfiguration} = require('@applitools/eyes-selenium');
const {Eyes, Target} = require('../index');

const Common = require('./Common');

let browser;


describe('VisualGridSimple', function () {
  this.timeout(5 * 60 * 1000);

  before(async function () {
    chromedriver.start();
  });

  beforeEach(function () {
    const chrome = Common.CHROME;
    browser = webdriverio.remote(chrome);
    return browser.init();
  });

  after(async function () {
    chromedriver.stop();
  });

  it('VisualGridTestPage', async function () {
    await browser.url('https://applitools.github.io/demo/TestPages/VisualGridTestPage');

    const eyes = new Eyes(true);
    eyes.setBatch(new BatchInfo('EyesRenderingBatch_WDIO'));
    eyes.setCorsIframeHandle(CorsIframeHandle.BLANK);

    const configuration = new SeleniumConfiguration();
    configuration.testName = 'Open Concurrency with Batch 2';
    configuration.appName = 'RenderingGridIntegration';
    configuration.addBrowser(800, 600, BrowserType.CHROME);
    configuration.addBrowser(700, 500, BrowserType.CHROME);
    configuration.addBrowser(400, 300, BrowserType.CHROME);

    eyes.configuration = configuration;
    await eyes.open(browser);

    await eyes.check('window', Target.window().ignoreRegions(new Region(200, 200, 50, 100)));

    await eyes.check('region', Target.region(new Region(200, 200, 50, 100)));

    await eyes.check('selector', Target.region('#scroll1'));

    await eyes.getRunner().getAllResults(false);

    await browser.end();
  });

});
