'use strict';

const {makeVisualGridClient, capturePageDom} = require('@applitools/visual-grid-client');

const {
  ArgumentGuard,
  EyesBase,
  TestResultsFormatter,
  CorsIframeHandle,
  CorsIframeHandler,
  TypeUtils,
  IgnoreRegionByRectangle
} = require('@applitools/eyes-sdk-core');

const {BrowserType, Configuration, RectangleSize} = require('@applitools/eyes-selenium');

const {TestResultSummary} = require('./runner/TestResultSummary');

const EyesWebDriver = require('./wrappers/EyesWebDriver');
const EyesWDIOUtils = require('./EyesWDIOUtils');
const WDIOJSExecutor = require('./WDIOJSExecutor');
const WebDriver = require('./wrappers/WebDriver');
const {VisualGridRunner} = require('./runner/VisualGridRunner');

const VERSION = require('../package.json').version;

class EyesVisualGrid extends EyesBase {
  /** @var {Logger} EyesVisualGrid#_logger */
  /** @var {Configuration} EyesVisualGrid#_configuration */

  /** @var {ImageMatchSettings} EyesVisualGrid#_defaultMatchSettings */

  /**
   * Creates a new (possibly disabled) Eyes instance that interacts with the Eyes Server at the specified url.
   *
   * @param {string} [serverUrl=EyesBase.getDefaultServerUrl()] The Eyes server URL.
   * @param {boolean} [isDisabled=false] Set to true to disable Applitools Eyes and use the webdriver directly.
   * @param {EyesRunner} [runner] - Set {@code true} to disable Applitools Eyes and use the WebDriver directly.
   */
  constructor(serverUrl, isDisabled, runner = new VisualGridRunner()) {
    super(serverUrl, isDisabled, new Configuration());
    /** @type {EyesRunner} */ this._runner = runner;

    this._runner._eyesInstances.push(this);

    /** @type {boolean} */ this._isOpen = false;
    /** @type {boolean} */ this._isVisualGrid = true;
    /** @type {EyesJsExecutor} */ this._jsExecutor = undefined;
    /** @type {CorsIframeHandle} */ this._corsIframeHandle = CorsIframeHandle.BLANK;

    /** @function */ this._checkWindowCommand = undefined;
    /** @function */ this._closeCommand = undefined;
    /** @function */ this._abortCommand = undefined;
    /** @type {Promise} */ this._closePromise = undefined;
  }

  /**
   * @signature `open(driver, configuration)`
   * @signature `open(driver, appName, testName, ?viewportSize, ?configuration)`
   *
   * @param {object} driver The web driver that controls the browser hosting the application under test.
   * @param {Configuration|string} optArg1 The Configuration for the test or the name of the application under the test.
   * @param {string} [optArg2] The test name.
   * @param {RectangleSize|object} [optArg3] The required browser's viewport size
   *   (i.e., the visible part of the document's body) or to use the current window's viewport.
   * @param {Configuration} [optArg4] The Configuration for the test
   * @return {Promise<EyesWebDriver>} A wrapped WebDriver which enables Eyes trigger recording and frame handling.
   */
  async open(driver, optArg1, optArg2, optArg3, optArg4) {
    ArgumentGuard.notNull(driver, 'driver');

    await this._initDriver(driver);

    if (optArg1 instanceof Configuration) {
      this._configuration.mergeConfig(optArg1);
    } else {
      this._configuration.setAppName(TypeUtils.getOrDefault(optArg1, this._configuration.getAppName()));
      this._configuration.setTestName(TypeUtils.getOrDefault(optArg2, this._configuration.getTestName()));
      this._configuration.setViewportSize(TypeUtils.getOrDefault(optArg3, this._configuration.getViewportSize()));
      this._configuration.setSessionType(TypeUtils.getOrDefault(optArg4, this._configuration.getSessionType()));
    }

    ArgumentGuard.notNull(this._configuration.getAppName(), 'appName');
    ArgumentGuard.notNull(this._configuration.getTestName(), 'testName');

    if (!this._configuration.getViewportSize() && this._configuration.getBrowsersInfo().length > 0) {
      for (const browserInfo of this._configuration.getBrowsersInfo()) {
        if (browserInfo.width) {
          this._configuration.setViewportSize(new RectangleSize(browserInfo.width, browserInfo.height));
          break;
        }
      }
    }
    if (!this._configuration.getViewportSize()) {
      const vs = await this._driver.getDefaultContentViewportSize();
      this._configuration.setViewportSize(vs);
    }

    if (this._configuration.getBrowsersInfo().length === 0 && this._configuration.getViewportSize()) {
      const vs = this._configuration.getViewportSize();
      this._configuration.addBrowser(vs.getWidth(), vs.getHeight(), BrowserType.CHROME);
    }

    if (this._runner.getConcurrentSessions()) this._configuration.setConcurrentSessions(this._runner.getConcurrentSessions());

    const {openEyes} = makeVisualGridClient({
      logger: this._logger,
      agentId: this.getFullAgentId(),
      apiKey: this._configuration.getApiKey(),
      showLogs: this._configuration.getShowLogs(),
      saveDebugData: this._configuration.getSaveDebugData(),
      proxy: this._configuration.getProxy(),
      serverUrl: this._configuration.getServerUrl(),
      renderConcurrencyFactor: this._configuration.getConcurrentSessions(),
    });

    if (this._configuration.getViewportSize()) {
      const vs = this._configuration.getViewportSize();
      await this.setViewportSize(vs);
    }

    const {checkWindow, close} = await openEyes({
      appName: this._configuration.getAppName(),
      testName: this._configuration.getTestName(),
      browser: this._configuration.getBrowsersInfo(),
      properties: this._configuration.getProperties(),
      batchSequenceName: this._configuration.getBatch() && this._configuration.getBatch().getSequenceName(),
      batchName: this._configuration.getBatch() && this._configuration.getBatch().getName(),
      batchId: this._configuration.getBatch() && this._configuration.getBatch().getId(),
      baselineBranchName: this._configuration.getBaselineBranchName(),
      baselineEnvName: this._configuration.getBaselineEnvName(),
      baselineName: this._configuration.getBaselineEnvName(),
      envName: this._configuration.getEnvironmentName(),
      branchName: this._configuration.getBranchName(),
      saveFailedTests: this._configuration.getSaveFailedTests(),
      saveNewTests: this._configuration.getSaveNewTests(),
      compareWithParentBranch: this._configuration.getCompareWithParentBranch(),
      ignoreBaseline: this._configuration.getIgnoreBaseline(),
      parentBranchName: this._configuration.getParentBranchName(),
      agentId: this.getFullAgentId(),
      isDisabled: this._configuration.getIsDisabled(),
      matchTimeout: this._configuration.getMatchTimeout(),

      ignoreCaret: this._configuration.getIgnoreCaret(),
      matchLevel: this._configuration.getMatchLevel(),

      // renderBatch,
      // waitForRenderedStatus,
      // renderThroat,
      // getRenderInfoPromise,
      // getHandledRenderInfoPromise,
      // getRenderInfo,
      // createRGridDOMAndGetResourceMapping,
      // eyesTransactionThroat,
    });

    this._isOpen = true;
    this._checkWindowCommand = checkWindow;
    this._closeCommand = async () => {
      return close(true).catch(err => {
        if (Array.isArray(err)) {
          return err;
        }

        throw err;
      });
    };
    this._abortCommand = async () => abort(true);

    return this._driver;
  }

  /**
   * @private
   * @param {object} driver
   */
  async _initDriver(driver) {
    if (driver instanceof EyesWebDriver) {
      this._driver = driver;
    } else {
      this._driver = new EyesWebDriver(this._logger, new WebDriver(driver), this);
    }
    this._jsExecutor = new WDIOJSExecutor(this._driver);
  }

  /**
   * @param {boolean} [throwEx=true]
   * @return {Promise<TestResults>}
   */
  async closeAndReturnResults(throwEx = true) {
    try {
      let resultsPromise = this._closePromise || this._closeCommand();
      const res = await resultsPromise;
      const testResultSummary = new TestResultSummary(res);

      if (throwEx === true) {
        for (const result of testResultSummary.getAllResults()) {
          if (result.getException()) {
            throw result.getException();
          }
        }
      }

      return testResultSummary;
    } finally {
      this._isOpen = false;
      this._closePromise = undefined;
    }
  }

  /**
   * @return {Promise}
   */
  async closeAsync() {
    if (!this._closePromise) {
      this._closePromise = this._closeCommand();
    }
  }

  /**
   * @param {boolean} [throwEx]
   * @return {Promise<TestResults>}
   */
  async close(throwEx = true) {
    const results = await this.closeAndReturnResults(throwEx);

    for (const result of results.getAllResults()) {
      if (result.getException()) {
        return result.getTestResults();
      }
    }

    return results.getAllResults()[0].getTestResults();
  }

  /**
   * @return {Promise<?TestResults>}
   */
  async abort() {
    if (typeof this._abortCommand === 'function') {
      if (this._closePromise) {
        this._logger.verbose('Can not abort while closing async, abort added to close promise.');
        return this._closePromise.then(() => this._abortCommand(true));
      }

      return this._abortCommand();
    }
    return null;
  }

  /**
   * @return {Promise}
   */
  async abortAsync() {
    this._closePromise = this.abort();
  }

  /**
   * @return {boolean}
   */
  getIsOpen() {
    return this._isOpen;
  }

  /**
   * @param {boolean} [throwEx]
   * @return {Promise<void>}
   */
  async closeAndPrintResults(throwEx = true) {
    const results = await this.closeAndReturnResults(throwEx);

    const testResultsFormatter = new TestResultsFormatter(results);
    // eslint-disable-next-line no-console
    console.log(testResultsFormatter.asFormatterString());
  }

  /**
   * @private
   * @param {{type: string, url: string, value: string}[]} blobs
   * @return {{type: string, url: string, value: Buffer}[]}
   */
  _blobsToResourceContents(blobs) {
    return blobs.map(({url, type, value}) => ({
      url,
      type,
      value: Buffer.from(value, 'base64'),
    }));
  }

  getRunner() {
    return this._runner;
  }

  /**
   * @return {boolean}
   */
  isEyesClosed() {
    return this._isOpen;
  }

  /**
   * @param {string} name
   * @param {WebdriverioCheckSettings} checkSettings
   */
  async check(name, checkSettings) {
    ArgumentGuard.notNull(checkSettings, 'checkSettings');

    if (TypeUtils.isNotNull(name)) {
      checkSettings.withName(name);
    }

    this._logger.verbose(`Dom extraction starting   (${checkSettings.toString()})   $$$$$$$$$$$$`);

    let targetSelector = await checkSettings.getTargetProvider();
    if (targetSelector) {
      targetSelector = await targetSelector.getSelector(this);
    }

    const pageDomResults = await capturePageDom({ executeScript: this._jsExecutor.executeScript.bind(this._jsExecutor) });
    const { cdt, url: pageUrl, blobs, resourceUrls, frames } = pageDomResults;

    if (this.getCorsIframeHandle() === CorsIframeHandle.BLANK) {
      CorsIframeHandler.blankCorsIframeSrcOfCdt(cdt, frames);
    }

    const resourceContents = this._blobsToResourceContents(blobs);
    if (frames && frames.length > 0) {
      for (let i = 0; i < frames.length; ++i) {
        frames[i].resourceContents = this._blobsToResourceContents(frames[i].blobs);
        delete frames[i].blobs;
      }
    }

    this._logger.verbose(`Dom extracted  (${checkSettings.toString()})   $$$$$$$$$$$$`);

    const source = await this._driver.getCurrentUrl();
    const ignoreRegions = await this._prepareRegions(checkSettings.getIgnoreRegions());

    await this._checkWindowCommand({
      resourceUrls,
      resourceContents,
      frames,
      url: pageUrl,
      cdt,
      tag: checkSettings.getName(),
      sizeMode: checkSettings.getSizeMode() === 'viewport' && this.getForceFullPageScreenshot() ? 'full-page' : checkSettings.getSizeMode(),
      selector: targetSelector ? targetSelector : undefined,
      region: checkSettings.getTargetRegion(),
      scriptHooks: checkSettings.getScriptHooks(),
      ignore: ignoreRegions,
      floating: checkSettings.getFloatingRegions(),
      sendDom: checkSettings.getSendDom() ? checkSettings.getSendDom() : this.getSendDom(),
      matchLevel: checkSettings.getMatchLevel() ? checkSettings.getMatchLevel() : this.getMatchLevel(),
      source,
    });
  }


  /**
   * Visually validates a region in the screenshot.
   *
   * @param {Region} region - The region to validate (in screenshot coordinates).
   * @param {string} [tag] - An optional tag to be associated with the screenshot.
   * @param {number} [matchTimeout] - The amount of time to retry matching.
   * @return {Promise<MatchResult>} - A promise which is resolved when the validation is finished.
   */
  async checkRegion(region, tag, matchTimeout) {
    await this.check(tag, Target.region(region).timeout(matchTimeout));
  }


  /**
   * @return {Promise<RectangleSize>}
   */
  async getViewportSize() {
    return this._configuration.getViewportSize();
  }

  /**
   * @param {RectangleSize|object} viewportSize
   */
  async setViewportSize(viewportSize) {
    ArgumentGuard.notNull(viewportSize, 'viewportSize');
    viewportSize = new RectangleSize(viewportSize);
    this._configuration.setViewportSize(viewportSize);

    if (this._driver) {
      const originalFrame = this._driver.getFrameChain();
      await this._driver.switchTo().defaultContent();

      await EyesWDIOUtils.setViewportSize(this._logger, this._driver, viewportSize);

      /*
            try {
              await EyesWDIOUtils.setViewportSize(this._logger, this._driver, viewportSize);
            } catch (err) {
              await this._driver.switchTo().frames(originalFrame); // Just in case the user catches that error
              throw new TestFailedError('Failed to set the viewport size', err);
            }
      */

      await this._driver.switchTo().frames(originalFrame);
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @return {boolean}
   */
  isVisualGrid() {
    return this._isVisualGrid;
  }

  /**
   * @param {CorsIframeHandle} corsIframeHandle
   */
  setCorsIframeHandle(corsIframeHandle) {
    this._corsIframeHandle = corsIframeHandle;
  }

  /**
   * @return {CorsIframeHandle}
   */
  getCorsIframeHandle() {
    return this._corsIframeHandle;
  }

  /**
   * @inheritDoc
   */
  getBaseAgentId() {
    return `eyes.webdriverio.visualgrid/${VERSION}`;
  }

  /**
   * @inheritDoc
   */
  async getInferredEnvironment() {
    return undefined;
  }

  /**
   * @inheritDoc
   */
  async getScreenshot() {
    return undefined;
  }

  /**
   * @inheritDoc
   */
  async getTitle() {
    return undefined;
  }

  /**
   * Get jsExecutor
   * @return {EyesJsExecutor}
   */
  get jsExecutor() {
    return this._jsExecutor;
  }

  /**
   * @deprecated
   * @param {Configuration} conf
   */
  setConfiguration(conf) {
    if (!(conf instanceof Configuration)) {
      conf = new Configuration(conf);
    }

    this._configuration = conf;
  }

  /**
   * @deprecated
   * @return {Configuration}
   */
  getConfiguration() {
    return this._configuration;
  }

  setApiKey(apiKey) {
    this._configuration.setApiKey(apiKey);
  }

  getApiKey() {
    return this._configuration.getApiKey();
  }

  /**
   * Forces a full page screenshot (by scrolling and stitching) if the browser only supports viewport screenshots).
   *
   * @param {boolean} shouldForce Whether to force a full page screenshot or not.
   */
  setForceFullPageScreenshot(shouldForce) {
    this._configuration.setForceFullPageScreenshot(shouldForce);
  }

  /**
   * @return {boolean} Whether Eyes should force a full page screenshot.
   */
  getForceFullPageScreenshot() {
    return this._configuration.getForceFullPageScreenshot();
  }

  /**
   * @private
   * @param {GetRegion[]} regions
   * @return {{type: string, url: string, value: Buffer}[]}
   */
  async _prepareRegions(regions) {
    if (regions && regions.length > 0) {
      const newRegions = [];

      for (const region of regions) {
        if (region instanceof IgnoreRegionByRectangle) {
          const plainRegion = (await region.getRegion(this, undefined)).toJSON();
          newRegions.push(plainRegion);
        } else {
          const selector = await region.getSelector(this);
          newRegions.push({ selector });
        }
      }

      return newRegions;
    }

    return regions;
  }

}

exports.EyesVisualGrid = EyesVisualGrid;
