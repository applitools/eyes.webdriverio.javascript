'use strict';

const {PositionMemento, Location} = require('eyes.sdk');

/**
 * Encapsulates state for {@link ElementPositionProvider} instances.
 */
class ElementPositionMemento extends PositionMemento {

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

module.exports = ElementPositionMemento;
