'use strict';

const {BrowserNames} = require('eyes.sdk');

const TakesScreenshotImageProvider = require('./TakesScreenshotImageProvider');
const FirefoxScreenshotImageProvider = require('./FirefoxScreenshotImageProvider');
const SafariScreenshotImageProvider = require('./SafariScreenshotImageProvider');

class ImageProviderFactory {

    /**
     * @param {UserAgent} userAgent
     * @param {Eyes} eyes
     * @param {Logger} logger
     * @param {EyesWebDriver} driver
     * @return {ImageProvider}
     */
    static getImageProvider(userAgent, eyes, logger, driver) {
        if (userAgent) {
            if (userAgent.getBrowser() === BrowserNames.Firefox) {
                try {
                    if (parseInt(userAgent.getBrowserMajorVersion(), 10) >= 48) {
                        return new FirefoxScreenshotImageProvider(eyes, logger, driver, eyes._promiseFactory);
                    }
                } catch (ignored) {
                    return new TakesScreenshotImageProvider(logger, driver, eyes._promiseFactory);
                }
            } else if (userAgent.getBrowser() === BrowserNames.Safari) {
                return new SafariScreenshotImageProvider(eyes, logger, driver, eyes._promiseFactory);
            }
        }
        return new TakesScreenshotImageProvider(logger, driver, eyes._promiseFactory);
    }
}

module.exports = ImageProviderFactory;
