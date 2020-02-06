'use strict';

const {EyesRunner} = require('./EyesRunner');
const {TestResultSummary} = require('./TestResultSummary');
const {TestResultContainer} = require('./TestResultContainer');
const {makeGetRenderingInfo} = require('@applitools/eyes-sdk-core')

class ClassicRunner extends EyesRunner {
  constructor() {
    super();

    /** @type {TestResults[]} */
    this._allTestResult = [];
    this._getRenderingInfo = undefined
  }

  makeGetRenderingInfo(getRenderingInfo) {
    if (!this._getRenderingInfo) {
      this._getRenderingInfo = makeGetRenderingInfo(getRenderingInfo)
    }
  }

  async getRenderingInfoWithCache() {
    if (this._getRenderingInfo) {
      return this._getRenderingInfo()
    } else {
      throw new Error(
        'Eyes runner could not get rendering info since makeGetRenderingInfo was not called before',
      )
    }
  }

  /**
   * @param {boolean} [shouldThrowException=true]
   * @return {Promise<TestResultSummary>}
   */
  async getAllTestResults(shouldThrowException = true) { // eslint-disable-line no-unused-vars
    const allResults = [];
    for (const testResults of this._allTestResult) {
      allResults.push(new TestResultContainer(testResults));
    }

    await this._closeAllBatches();
    return new TestResultSummary(allResults);
  }
}

exports.ClassicRunner = ClassicRunner;
