'use strict';

const {Location} = require('@applitools/eyes.sdk.core');

const ElementPositionProvider = require('./ElementPositionProvider');
const EyesWebElement = require('./../wrappers/EyesWebElement');
const WebElement = require('./../wrappers/WebElement');
const EyesWDIOUtils = require('./../EyesWDIOUtils');

class CssTranslateElementPositionProvider extends ElementPositionProvider {

  /**
   * @param {Logger} logger A Logger instance.
   * @param {EyesWebDriver} driver
   * @param {EyesWebElement} element
   */
  constructor(logger, driver, element) {
    super(logger, driver, element);

    this._driver = driver;
    this._logger.verbose("creating CssTranslateElementPositionProvider");
  }

  /**
   * @override
   * @inheritDoc
   * @return {Promise.<Location>}
   */
  getCurrentPosition() {
    const that = this;
    let position;
    return super.getCurrentPosition().then(/**@type {Location}*/_position => {
      position = _position;
      return that._transformsOffset();
    }).then(/**@type {Location}*/transformsOffset => {
      return position.offsetNegative(transformsOffset);
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  setPosition(location) {
    const that = this;

    const loc = new Location(location);
    let outOfEyes;

    return super.setPosition(location).then(() => {
      return that.getCurrentPosition();
    }).then(currentPosition => {
      return loc.offsetNegative(currentPosition);
    }).then(outOfEyes_ => {
      outOfEyes = outOfEyes_;

      return that._transformsOffset();
    }).then(/** @type {Location}*/transformsOffset => {
      const webElementPromise = WebElement.findElement(that._driver.webDriver, that.element.getWebElement()._locator);

      const position = transformsOffset.offsetNegative(outOfEyes);
      return EyesWDIOUtils.elementTranslateTo(that._driver.eyes.jsExecutor, webElementPromise, position);
    }).catch(e => {
      throw e;
    });
  }


  /**
   * @return {Promise.<Location>}
   */
  _transformsOffset() {
    this._logger.verbose('Getting element transforms...');

    const that = this;

    const webElementPromise = WebElement.findElement(this._driver.webDriver, this.element.getWebElement()._locator);

    return webElementPromise.then(webElement => {
      return EyesWDIOUtils.getCurrentElementTransforms(that._driver, webElement.element);
    }).then(transforms => {
      that._logger.verbose(`Current transforms: ${JSON.stringify(transforms)}`);

      const transformPositions = Object.keys(transforms).filter(key => {
        return transforms[key] !== null && transforms[key] !== '';
      }).map(key => {
        const t = transforms[key];

        return CssTranslateElementPositionProvider._getPositionFromTransforms(t);
      });

      for (let tpIndex in transformPositions) {
        if (!transformPositions[0].equals(transformPositions[tpIndex])) {
          throw new Error('Got different css positions!')
        }
      }

      return transformPositions[0] || Location.ZERO;
    });
  }


  static _getPositionFromTransforms(transform) {
    const regexp = new RegExp(/^translate\(\s*(\-?)([\d, \.]+)px,\s*(\-?)([\d, \.]+)px\s*\)/);

    const data = transform.match(regexp);

    if (!data) {
      throw new Error(`Can't parse CSS transition: ${transform}!`);
    }

    let x = Math.round(parseFloat(data[2]));
    let y = Math.round(parseFloat(data[4]));

    if (!data[1]) {
      x *= -1;
    }

    if (!data[3]) {
      y *= -1;
    }

    return new Location(x, y);
  }
}

module.exports = CssTranslateElementPositionProvider;