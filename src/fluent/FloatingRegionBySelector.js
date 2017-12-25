'use strict';

const {GetFloatingRegion, FloatingMatchSettings} = require('eyes.sdk');

class FloatingRegionBySelector extends GetFloatingRegion {

    /**
     * @param {By} regionSelector
     * @param {int} maxUpOffset
     * @param {int} maxDownOffset
     * @param {int} maxLeftOffset
     * @param {int} maxRightOffset
     */
    constructor(regionSelector, maxUpOffset, maxDownOffset, maxLeftOffset, maxRightOffset) {
        super();
        this._element = regionSelector;
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
        return eyesBase.getDriver().findElement(that._element).then(element => {
            return element.getLocation().then(point => {
                return element.getSize().then(size => {
                    return new FloatingMatchSettings(
                        Math.ceil(point.x), Math.ceil(point.y), size.width, size.height,
                        that._maxUpOffset, that._maxDownOffset, that._maxLeftOffset, that._maxRightOffset
                    );
                });
            });
        });
    }
}

module.exports = FloatingRegionBySelector;
