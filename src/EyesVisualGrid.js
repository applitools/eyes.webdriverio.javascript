'use strict';

const {makeVisualGridClient} = require('@applitools/visual-grid-client');
const {getProcessPageAndSerializeScript} = require('@applitools/dom-snapshot');
const {ArgumentGuard, TypeUtils} = require('@applitools/eyes-common');

const {
  EyesBase,
  RectangleSize,
  TestFailedError,
  TestResultsFormatter,
  CorsIframeHandle,
  CorsIframeHandler,
  Configuration,
} = require('@applitools/eyes-sdk-core');

const {BrowserType, SeleniumConfiguration} = require('@applitools/eyes-selenium');

const EyesWebDriver = require('./wrappers/EyesWebDriver');
const EyesWDIOUtils = require('./EyesWDIOUtils');
const WDIOJSExecutor = require('./WDIOJSExecutor');
const WebDriver = require('./wrappers/WebDriver');

const VERSION = require('../package.json').version;

class EyesVisualGrid extends EyesBase {
  /** @var {Logger} EyesVisualGrid#_logger */
  /** @var {SeleniumConfiguration} EyesVisualGrid#_configuration */

  /** @var {ImageMatchSettings} EyesVisualGrid#_defaultMatchSettings */

  /**
   * Creates a new (possibly disabled) Eyes instance that interacts with the Eyes Server at the specified url.
   *
   * @param {string} [serverUrl=EyesBase.getDefaultServerUrl()] The Eyes server URL.
   * @param {boolean} [isDisabled=false] Set to true to disable Applitools Eyes and use the webdriver directly.
   */
  constructor(serverUrl, isDisabled) {
    super(serverUrl, isDisabled, new SeleniumConfiguration());

    /** @type {boolean} */ this._isOpen = false;
    /** @type {boolean} */ this._isVisualGrid = true;
    /** @type {EyesJsExecutor} */ this._jsExecutor = undefined;
    /** @type {CorsIframeHandle} */ this._corsIframeHandle = CorsIframeHandle.BLANK;
    /** @type {string} */ this._processPageAndSerializeScript = undefined;

    this._checkWindowCommand = undefined;
    this._closeCommand = undefined;
  }

  /**
   * @signature `open(driver, configuration)`
   * @signature `open(driver, appName, testName, ?viewportSize, ?configuration)`
   *
   * @param {object} driver The web driver that controls the browser hosting the application under test.
   * @param {SeleniumConfiguration|string} optArg1 The Configuration for the test or the name of the application under the test.
   * @param {string} [optArg2] The test name.
   * @param {RectangleSize|RectangleSizeObject} [optArg3] The required browser's viewport size
   *   (i.e., the visible part of the document's body) or to use the current window's viewport.
   * @param {SeleniumConfiguration} [optArg4] The Configuration for the test
   * @return {Promise<EyesWebDriver>} A wrapped WebDriver which enables Eyes trigger recording and frame handling.
   */
  async open(driver, optArg1, optArg2, optArg3, optArg4) {
    ArgumentGuard.notNull(driver, 'driver');

    await this._initDriver(driver);

    let configuration;
    if (optArg1 instanceof Configuration) {
      this._configuration.mergeConfig(optArg1);
    } else {
      this._configuration.setAppName(TypeUtils.getOrDefault(optArg1, this._configuration.getAppName()));
      this._configuration.setTestName(TypeUtils.getOrDefault(optArg2, this._configuration.getTestName()));
      if (!optArg3) {
        optArg3 = TypeUtils.getOrDefault(this._configuration.getViewportSize(), await EyesWDIOUtils.getViewportSize(this._jsExecutor));
      }
      this._configuration.setViewportSize(optArg3);
      this._configuration.setSessionType(TypeUtils.getOrDefault(optArg4, this._configuration.getSessionType()));
    }

    if (configuration) {
      const newConfiguration = (configuration instanceof SeleniumConfiguration) ? configuration : SeleniumConfiguration.fromObject(configuration);
      this._configuration.mergeConfig(newConfiguration);
    }

    if (this._configuration.getBrowsersInfo().length === 0 && this._configuration.getViewportSize()) {
      const viewportSize = this._configuration.getViewportSize();
      this._configuration.addBrowser(viewportSize.getWidth(), viewportSize.getHeight(), BrowserType.CHROME);
    }

    const {openEyes} = makeVisualGridClient({
      apiKey: this._configuration.getApiKey(),
      showLogs: this._configuration.getShowLogs(),
      saveDebugData: this._configuration.getSaveDebugData(),
      proxy: this._configuration.getProxy(),
      serverUrl: this._configuration.getServerUrl(),
      renderConcurrencyFactor: this._configuration.getConcurrentSessions(),
    });

    this._processPageAndSerializeScript = await getProcessPageAndSerializeScript();

    if (this._configuration.getViewportSize()) {
      await this.setViewportSize(this._configuration.getViewportSize());
    }

    const {checkWindow, close} = await openEyes({
      logger: this._logger,

      appName: this._configuration.getAppName(),
      testName: this._configuration.getTestName(),
      browser: this._configuration.getBrowsersInfo(),
      properties: this._configuration.getProperties(),
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
      agentId: this._configuration.getAgentId(),
      isDisabled: this._configuration.getIsDisabled(),
      matchTimeout: this._configuration.getMatchTimeout(),

      ignoreCaret: this._defaultMatchSettings.getIgnoreCaret(),
      matchLevel: this._defaultMatchSettings.getMatchLevel(),

      // renderBatch,
      // waitForRenderedStatus,
      // renderThroat,
      // getRenderInfoPromise,
      // getHandledRenderInfoPromise,
      // getRenderInfo,
      // createRGridDOMAndGetResourceMapping,
      // eyesTransactionThroat,
    });

    this._checkWindowCommand = checkWindow;
    this._closeCommand = close;
    this._isOpen = true;

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
   * @param {boolean} [throwEx]
   * @return {Promise<TestResults>}
   */
  async close(throwEx = true) {
    try {
      const results = await this._closeCommand(throwEx);
      const first = results[0];

      if (first instanceof TestFailedError) {
        return first.getTestResults();
      }

      return first;
    } catch (err) {
      if (Array.isArray(err)) {
        throw err[0];
      }

      throw err;
    } finally {
      this._isOpen = false;
    }
  }

  // noinspection JSMethodCanBeStatic
  /**
   * @return {Promise<TestResults>}
   */
  async abortIfNotClosed() {
    return null; // TODO - implement?
  }

  /**
   * @return {boolean}
   */
  getIsOpen() {
    return this._isOpen;
  }

  /**
   * @param {boolean} [throwEx]
   * @return {Promise<(TestResults|Error)[]>}
   */
  async closeAndReturnResults(throwEx = true) {
    try {
      return await this._closeCommand(throwEx);
    } finally {
      this._isOpen = false;
    }
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
   * @deprecated
   */
  getEyesRunner() {
    const runner = {};
    runner.getAllResults = async () => {
      return await this.closeAndReturnResults();
    };
    return runner;
  }

  getRunner() {
    const runner = {};
    runner.getAllResults = async (throwEx) => {
      return await this.closeAndReturnResults(throwEx);
    };
    return runner;
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

    let targetSelector = await checkSettings.targetSelector;
    if (targetSelector) {
      targetSelector = targetSelector.value;
    }

    const domCaptureScript = `var callback = arguments[arguments.length - 1]; return (${this._processPageAndSerializeScript})().then(JSON.stringify).then(callback, function(err) {callback(err.stack || err.toString())})`;
    const results = await this._jsExecutor.executeAsyncScript(domCaptureScript);
    const {cdt, url: pageUrl, blobs, resourceUrls, frames} = JSON.parse(results);

    if (this.getCorsIframeHandle() === CorsIframeHandle.BLANK) {
      CorsIframeHandler.blankCorsIframeSrcOfCdt(cdt, frames);
    }

    const resourceContents = blobs.map(({url, type, value}) => ({
      url,
      type,
      value: Buffer.from(value, 'base64'),
    }));

    this._logger.verbose(`Dom extracted  (${checkSettings.toString()})   $$$$$$$$$$$$`);

    await this._checkWindowCommand({
      resourceUrls,
      resourceContents,
      // frames
      url: pageUrl,
      cdt,
      tag: checkSettings.getName(),
      sizeMode: checkSettings.getSizeMode(),
      selector: targetSelector ? targetSelector : undefined,
      region: checkSettings.getTargetRegion(),
      scriptHooks: checkSettings.getScriptHooks(),
      ignore: checkSettings.getIgnoreRegions(),
      floating: checkSettings.getFloatingRegions(),
      sendDom: checkSettings.getSendDom() ? checkSettings.getSendDom() : this.getSendDom(),
      matchLevel: checkSettings.getMatchLevel() ? checkSettings.getMatchLevel() : this.getMatchLevel(),
    });
  }

  /**
   * @return {Promise<RectangleSize>}
   */
  async getViewportSize() {
    return this._configuration.getViewportSize();
  }

  /**
   * @param {RectangleSize} viewportSize
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
    return `eyes.webdriverio/${VERSION}`;
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
   * @param {Configuration} conf
   */
  setConfiguration(conf) {
    this._configuration = conf;
  }

}

exports.EyesVisualGrid = EyesVisualGrid;
