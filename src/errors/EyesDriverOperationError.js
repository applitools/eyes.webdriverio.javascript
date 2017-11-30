'use strict';

const {EyesError} = require('eyes.sdk');

/**
 * Encapsulates an error when trying to perform an action using WebDriver.
 */
class EyesDriverOperationError extends EyesError {
}

module.exports = EyesDriverOperationError;
