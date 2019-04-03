'use strict';

const chromedriver = require('chromedriver');
const {remote} = require('webdriverio');
const {equal} = require('assert');
const {BatchInfo, Region, CorsIframeHandle} = require('@applitools/eyes-sdk-core');
const {BrowserType, Configuration} = require('@applitools/eyes-selenium');
const {Eyes, Target, VisualGridRunner} = require('../index');

const Common = require('./Common');

let browser;

describe('VisualGridSimple', function () {
  this.timeout(5 * 60 * 1000);

  before(async function () {
    chromedriver.start();
  });

  beforeEach(async () => {
    const chrome = Common.CHROME;
    browser = await remote(chrome);
  });

  afterEach(async () => {
    await browser.deleteSession();
  });

  after(async function () {
    chromedriver.stop();
  });

  it('VisualGridTestPage', async function () {
    await browser.url('https://applitools.github.io/demo/TestPages/VisualGridTestPage');

    const eyes = new Eyes(new VisualGridRunner(3));
    eyes.setBatch(new BatchInfo('EyesRenderingBatch_WDIO'));
    eyes.setCorsIframeHandle(CorsIframeHandle.BLANK);

    const configuration = new Configuration();
    configuration.setTestName('Open Concurrency with Batch 2');
    configuration.setAppName('RenderingGridIntegration');
    configuration.addBrowser(800, 600, BrowserType.CHROME);
    configuration.addBrowser(700, 500, BrowserType.CHROME);
    configuration.addBrowser(400, 300, BrowserType.CHROME);

    eyes.setConfiguration(configuration);
    await eyes.open(browser);

    await eyes.check('window', Target.window().ignoreRegions(new Region(200, 200, 50, 100)));

    await eyes.check('region', Target.region(new Region(200, 200, 50, 100)));

    await eyes.check('selector', Target.region('#scroll1'));

    const result = await eyes.close(false);

    equal(result.isPassed(), true);
  });

});
