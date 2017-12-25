'use strict';

const {GetFloatingRegion, FloatingMatchSettings} = require('eyes.sdk');

class FloatingRegionByElement extends GetFloatingRegion {

    /**
     * @param {WebElement} webElement
     * @param {int} maxUpOffset
     * @param {int} maxDownOffset
     * @param {int} maxLeftOffset
     * @param {int} maxRightOffset
     */
    constructor(webElement, maxUpOffset, maxDownOffset, maxLeftOffset, maxRightOffset) {
        super();
        this._element = webElement;
        this._maxUpOffset = maxUpOffset;
        this._maxDownOffset = maxDownOffset;
        this._maxLeftOffset = maxLeftOffset;
        this._maxRightOffset = maxRightOffset;
    }

    // noinspection JSCheckFunctionSignatures
    /**
     * @override
     * @param {Eyes} eyesBase
     */
    getRegion(eyesBase) {
        const that = this;
        return that._element.getLocation().then(point => {
            return that._element.getSize().then(size => {
                return new FloatingMatchSettings(
                    Math.ceil(point.x), Math.ceil(point.y), size.width, size.height,
                    that._maxUpOffset, that._maxDownOffset, that._maxLeftOffset, that._maxRightOffset
                );
            });
        });
    }
}

module.exports = FloatingRegionByElement;
