'use strict';

/**
 * @interface
 */
class JavascriptHandler {

    /**
     * @param {!String} script
     * @param {Object...} args
     * @return {Promise.<void>}
     */
    handle(script, ...args) {
        return null;
    }
}

module.exports = JavascriptHandler;
