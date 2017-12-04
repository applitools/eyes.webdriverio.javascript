'use strict';


class TargetLocator {


  constructor(driver) {
    this._driver = driver;
  }


  defaultContent() {
    return this._driver.frame();
  }



}

module.exports = TargetLocator;
