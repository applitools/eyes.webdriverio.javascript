'use strict';

/**
 * @interface
 */
class JavascriptHandler {

    /**
     * @param {PromiseFactory} promiseFactory
     */
    constructor(promiseFactory) {
        this._promiseFactory = promiseFactory;
    }

    /**
     * @param {!String} script
     * @param {Object...} args
     * @return {Promise.<void>}
     */
    handle(script, ...args) {
        return this._promiseFactory.resolve();
    }
}

module.exports = JavascriptHandler;
