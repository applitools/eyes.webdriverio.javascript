'use strict';

const RegionPositionCompensation = require('./RegionPositionCompensation');

class NullRegionPositionCompensation extends RegionPositionCompensation {

    /**
     * @override
     * @inheritDoc
     */
    compensateRegionPosition(region, pixelRatio) {
        return region;
    }
}

module.exports = NullRegionPositionCompensation;
