'use strict';

const {TestResultSummary} = require('./TestResultSummary');

class VisualGridRunner {
  // this class is just a mock for compatibility with Java

  /**
   * @param {number} [concurrentSessions]
   */
  constructor(concurrentSessions) {
    this._concurrentSessions = concurrentSessions;

    /** @type {EyesVisualGrid[]} */
    this._eyesInstances = [];
  }

  /**
   * @return {number}
   */
  getConcurrentSessions() {
    return this._concurrentSessions;
  }

  /**
   * @param {boolean} [throwEx=true]
   * @return {Promise<TestResultSummary>}
   */
  async getAllTestResults(throwEx = true) {
    if (this._eyesInstances.length === 1) {
      return this._eyesInstances[0].closeAndReturnResults(throwEx);
    } else if (this._eyesInstances.length > 1) {
      const resultsPromise = [];
      const allResults = [];

      for (const eyesInstance of this._eyesInstances) {
        resultsPromise.push(eyesInstance.closeAndReturnResults(false));
      }

      const results = await Promise.all(resultsPromise);
      for (const result of results) {
        allResults.push(...result.getAllResults());
      }

      if (throwEx === true) {
        for (const result of allResults) {
          if (result.getException()) {
            throw result.getException();
          }
        }
      }

      return new TestResultSummary(allResults);
    }

    return null;
  }
}

exports.VisualGridRunner = VisualGridRunner;
