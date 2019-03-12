'use strict';

const {PositionMemento, Location} = require('@applitools/eyes-sdk-core');

/**
 * Encapsulates state for {@link ScrollPositionProvider} instances.
 */
class ScrollPositionMemento extends PositionMemento {

    /**
     * @param {Location} position The current location to be saved.
     */
    constructor(position) {
        super();

        this._position = new Location(position);
    }

    /**
     * @return {int}
     */
    getX() {
        return this._position.getX();
    }

    /**
     * @return {int}
     */
    getY() {
        return this._position.getY();
    }
}

module.exports = ScrollPositionMemento;
