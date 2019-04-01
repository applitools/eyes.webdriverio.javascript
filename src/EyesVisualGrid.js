'use strict';

const {makeVisualGridClient} = require('@applitools/visual-grid-client');
const {getProcessPageAndSerializeScript} = require('@applitools/dom-snapshot');

const {
  ArgumentGuard,
  EyesBase,
  RectangleSize,
  TestFailedError,
  TestResultsFormatter,
  CorsIframeHandle,
  CorsIframeHandler,
  Configuration,
  TypeUtils
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
      this._configuration.appName = TypeUtils.getOrDefault(optArg1, this._configuration.appName);
      this._configuration.testName = TypeUtils.getOrDefault(optArg2, this._configuration.testName);
      this._configuration.viewportSize = TypeUtils.getOrDefault(optArg3, this._configuration.viewportSize);
      this._configuration.sessionType = TypeUtils.getOrDefault(optArg4, this._configuration.sessionType);
    }
    if (!this._configuration.viewportSize) {
      //todo set first viewportSize from browsersInfo
      this._configuration.viewportSize = await this._driver.getDefaultContentViewportSize();
    }

    if (configuration) {
      const newConfiguration = (configuration instanceof SeleniumConfiguration) ? configuration : SeleniumConfiguration.fromObject(configuration);
      this._configuration.mergeConfig(newConfiguration);
    }

    if (this._configuration.browsersInfo.length === 0 && this._configuration.viewportSize) {
      const viewportSize = this._configuration.viewportSize;
      this._configuration.addBrowser(viewportSize.getWidth(), viewportSize.getHeight(), BrowserType.CHROME);
    }

    const {openEyes} = makeVisualGridClient({
      apiKey: this._configuration.apiKey,
      showLogs: this._configuration.showLogs,
      saveDebugData: this._configuration.saveDebugData,
      proxy: this._configuration.proxy,
      serverUrl: this._configuration.serverUrl,
      renderConcurrencyFactor: this._configuration.concurrentSessions,
    });

    this._processPageAndSerializeScript = await getProcessPageAndSerializeScript();

    if (this._configuration.viewportSize) {
      const vs = this._configuration.viewportSize;
      await this.setViewportSize(vs);
    }

    const {checkWindow, close} = await openEyes({
      logger: this._logger,

      appName: this._configuration.appName,
      testName: this._configuration.testName,
      browser: this._configuration.browsersInfo,
      properties: this._configuration.properties,
      batchName: this._configuration.batch && this._configuration.batch.getName(),
      batchId: this._configuration.batch && this._configuration.batch.getId(),
      baselineBranchName: this._configuration.baselineBranchName,
      baselineEnvName: this._configuration.baselineEnvName,
      baselineName: this._configuration.baselineEnvName,
      envName: this._configuration.environmentName,
      branchName: this._configuration.branchName,
      saveFailedTests: this._configuration.saveFailedTests,
      saveNewTests: this._configuration.saveNewTests,
      compareWithParentBranch: this._configuration.compareWithParentBranch,
      ignoreBaseline: this._configuration.ignoreBaseline,
      parentBranchName: this._configuration.parentBranchName,
      agentId: this._configuration.agentId,
      isDisabled: this._configuration.isDisabled,
      matchTimeout: this._configuration.matchTimeout,

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
  async closeAndPrintResults(throwEx = false) {
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
    runner.getAllResults = async (throwEx = false) => {
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
   * @param {RectangleSize|object} viewportSize
   */
  async setViewportSize(viewportSize) {
    ArgumentGuard.notNull(viewportSize, 'viewportSize');
    viewportSize = new RectangleSize(viewportSize);
    this._configuration.viewportSize = viewportSize;

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

  async addMouseTrigger(action, control, cursor) {
    if (this._configuration.isDisabled) {
      this._logger.verbose(`Ignoring ${action} (disabled)`);
      return;
    }

    // Triggers are actually performed on the previous window.
    if (!this._lastScreenshot) {
      this._logger.verbose(`Ignoring ${action} (no screenshot)`);
      return;
    }

    if (!FrameChain.isSameFrameChain(this._driver.getFrameChain(), this._lastScreenshot.getFrameChain())) {
      this._logger.verbose(`Ignoring ${action} (different frame)`);
      return;
    }

    EyesBase.prototype.addMouseTriggerBase.call(this, action, control, cursor);
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
   * @deprecated
   * @param {Configuration} conf
   */
  setConfiguration(conf) {
    if (!(conf instanceof Configuration)) {
      conf = new Configuration(conf);
    }

    this._configuration.mergeConfig(conf);
  }

  /**
   * @deprecated
   * @return {Configuration}
   */
  getConfiguration() {
    return this._configuration;
  }

  /**
   * @param {Configuration} conf
   */
  set configuration(conf) {
    if (!(conf instanceof Configuration)) {
      conf = new Configuration(conf);
    }

    this._configuration.mergeConfig(conf);
  }

  /**
   * @return {Configuration}
   */
  get configuration() {
    return this._configuration;
  }

  setApiKey(apiKey) {
    this._configuration.apiKey = apiKey;
  }

  getApiKey() {
    return this._configuration.apiKey;
  }

}

exports.EyesVisualGrid = EyesVisualGrid;
