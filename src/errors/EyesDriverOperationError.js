'use strict';

const {EyesError} = require('@applitools/eyes-sdk-core');

/**
 * Encapsulates an error when trying to perform an action using WebDriver.
 */
class EyesDriverOperationError extends EyesError {
}

module.exports = EyesDriverOperationError;
