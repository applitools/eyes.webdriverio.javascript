'use strict';

/**
 * @interface
 */
class RegionPositionCompensation {

    /**
     * @param {Region} region
     * @param {number} pixelRatio
     * @return {Region}
     */
    compensateRegionPosition(region, pixelRatio) {}
}

module.exports = RegionPositionCompensation;
