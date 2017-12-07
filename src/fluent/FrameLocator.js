'use strict';

class FrameLocator {

    constructor() {
        /** @type {WebElement} */
        this._frameElement = null;
        /** @type {By} */
        this._frameSelector = null;
        /** @type {String} */
        this._frameNameOrId = null;
        /** @type {Integer} */
        this._frameIndex = null;
    }

    /**
     * @return {Integer}
     */
    getFrameIndex() {
        return this._frameIndex;
    }

    /**
     * @return {String}
     */
    getFrameNameOrId() {
        return this._frameNameOrId;
    }

    /**
     * @return {By}
     */
    getFrameSelector() {
        return this._frameSelector;
    }

    /**
     * @return {WebElement}
     */
    getFrameElement() {
        return this._frameElement;
    }

    /**
     * @param frameSelector
     */
    setFrameSelector(frameSelector) {
        this._frameSelector = frameSelector;
    }

    /**
     * @param frameNameOrId
     */
    setFrameNameOrId(frameNameOrId) {
        this._frameNameOrId = frameNameOrId;
    }

    /**
     * @param frameIndex
     */
    setFrameIndex(frameIndex) {
        this._frameIndex = frameIndex;
    }

    /**
     * @param frameElement
     */
    setFrameElement(frameElement) {
        this._frameElement = frameElement;
    }
}

module.exports = FrameLocator;
