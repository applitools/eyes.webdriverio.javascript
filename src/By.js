

class By {


  static id(id) {
    return '#' + id;
  }


  static name(name) {
    return `[name=${name}]`;
  }


  static cssSelector(cssSelector) {
    return cssSelector;
  }


  static xPath(xPath) {
    return xPath;
  }


  static attributeValue(attributeName, value) {
    return `[${attributeName}=${value}]`;
  }

}

module.exports = By;
