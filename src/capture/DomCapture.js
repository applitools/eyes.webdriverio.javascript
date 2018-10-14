'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url');
const {Location} = require('@applitools/eyes.sdk.core');
const isAbsoluteUrl = require('is-absolute-url');
const request = require('request-promise-native');

class DomCapture {

  static get CAPTURE_FRAME_SCRIPT() {
    const scriptPath = path.join(__dirname, '..', './resources/CaptureFrame.js');
    const buffer = fs.readFileSync(scriptPath);
    return buffer.toString();
  }

  static get CAPTURE_CSSOM_SCRIPT() {
    const scriptPath = path.join(__dirname, '..', './resources/CaptureCssom.js');
    const buffer = fs.readFileSync(scriptPath);
    return buffer.toString();
  }

  /**
   * @param {Logger} logger A Logger instance.
   * @param {EyesWebDriver} driver
   * @param {PositionProvider} [positionProvider]
   * @return {Promise.<string>}
   */
  static async getFullWindowDom(logger, driver, positionProvider) {
    let originalPosition;
    if (positionProvider) {
      originalPosition = await positionProvider.getState();
      await positionProvider.setPosition(Location.ZERO);
    }

    const dom = await this.getWindowDom(logger, driver);

    if (positionProvider) {
      await positionProvider.restoreState(originalPosition);
    }

    return dom;
  }

  /**
   * @param {Logger} logger A Logger instance.
   * @param {EyesWebDriver} driver
   * @return {Promise.<string>}
   */
  static getWindowDom(logger, driver) {
    const argsObj = {
      styleProps: [
        "background-color",
        "background-image",
        "background-size",
        "color",
        "border-width",
        "border-color",
        "border-style",
        "padding",
        "margin"
      ],
      attributeProps: null/*[
        {all: ["id", "class"]},
        {IMG: ["src"]},
        {IFRAME: ["src"]},
        {A: ["href"]},
      ]*/,
      rectProps: [
        "width",
        "height",
        "top",
        "left"
      ],
      ignoredTagNames: ["HEAD", "SCRIPT"]
    };

    return DomCapture._getFrameDom(logger, driver, argsObj);
  }


  static async _getFrameDom(logger, driver, argsObj) {
    try {
      const {value: json} = await driver.remoteWebDriver.execute(DomCapture.CAPTURE_FRAME_SCRIPT, argsObj);

      const url = await driver.remoteWebDriver.getUrl();

      const domTree = JSON.parse(json);

      await DomCapture._traverseDomTree(logger, driver, argsObj, domTree, -1, url);

      return domTree;
    } catch (e) {
      throw new Error(`Error: ${e}`);
    }
  }


  static async _traverseDomTree(logger, driver, argsObj, domTree, frameIndex, baseUri) {
    if (!domTree.tagName) return;

    let tagNameObj = domTree.tagName;

    if (frameIndex > -1) {
      // Stopwatch stopwatch = Stopwatch.StartNew();

      await driver.switchTo().frame(frameIndex);
      // logger.Verbose("switching to frame took {0} ms", stopwatch.Elapsed.TotalMilliseconds);
      //IDictionary<string, object> dom = (IDictionary<string, object>)((IJavaScriptExecutor)driver).ExecuteScript(captureFrameScript_, argsObj);
      // stopwatch.Reset();
      // stopwatch.Start();
      const {value: json} = await driver.remoteWebDriver.execute(DomCapture.CAPTURE_FRAME_SCRIPT, argsObj);
      // logger.Verbose("executing javascript to capture frame's script took {0} ms", stopwatch.Elapsed.TotalMilliseconds);
      // const dom = (JObject)JsonConvert.DeserializeObject(json);
      const dom = JSON.parse(json);

      domTree['childNodes'] = dom;
      let srcUrl = null;
      if (domTree.attributes) {
        const attrsNodeObj = domTree.attributes;
        const attrsNode = attrsNodeObj;
        if (attrsNode.src) {
          const srcUrlObj = attrsNode.src;
          srcUrl = srcUrlObj.toString();
        }
      }
      if (srcUrl == null) {
        logger.verbose("WARNING! IFRAME WITH NO SRC");
      }
      // stopwatch.Reset();
      // stopwatch.Start();
      const srcUri = url.resolve(baseUri, srcUrl);
      await DomCapture._traverseDomTree(logger, driver, argsObj, dom, -1, srcUri);
      await driver.switchTo().parentFrame();
      // logger.verbose("switching to parent frame took {0} ms", stopwatch.Elapsed.TotalMilliseconds);
    }

    const tagName = tagNameObj;
    const isHTML = tagName.toUpperCase() === 'HTML';

    if (isHTML) {
      // const css = await DomCapture.getFrameBundledCss(logger, driver, baseUri);
      // domTree["css"] = css;
    }

    await DomCapture._loop(logger, driver, argsObj, domTree, baseUri);
  }

  static async _loop(logger, driver, argsObj, domTree, baseUri) {
    if (!domTree.childNodes) return;
    const childNodes = domTree.childNodes;
    let index = 0;
    //Stopwatch stopwatch = Stopwatch.StartNew();
    for (let node of childNodes) {
      const domSubTree = node;
      if (domSubTree) {
        const tagName = domSubTree.tagName;
        const isIframe = tagName.toUpperCase() === 'IFRAME';

        if (isIframe) {
          await DomCapture._traverseDomTree(logger, driver, argsObj, domSubTree, index, baseUri);
          index++;
        } else {
          const childSubNodesObj = domSubTree.childNodes;
          if (!childSubNodesObj || childSubNodesObj.length === 0) continue;
          await DomCapture._traverseDomTree(logger, driver, argsObj, domSubTree, -1, baseUri);
          return;
        }
      }
    }
//logger.Verbose("looping through {0} child nodes (out of which {1} inner iframes) took {2} ms", childNodes.Count, index, stopwatch.Elapsed.TotalMilliseconds);
  }


  static async getFrameBundledCss(logger, driver, baseUri) {
    if (!isAbsoluteUrl(baseUri)) {
      logger.verbose("WARNING! Base URL is not an absolute URL!");
    }

    const sb = new Buffer('');
    // Stopwatch stopwatch = Stopwatch.StartNew();
    const {value: result} = await driver.remoteWebDriver.execute(DomCapture.CAPTURE_CSSOM_SCRIPT);
    // logger.Verbose("executing javascript to capture css took {0} ms", stopwatch.Elapsed.TotalMilliseconds);
    for (const item of result) {
      // stopwatch.Reset();
      // stopwatch.Start();
      const kind = item.substring(0, 5);
      const value = item.substring(5);
      // logger.Verbose("splitting css result item took {0} ms", stopwatch.Elapsed.TotalMilliseconds);
      let css;
      if (kind === "text:") {
        css = await DomCapture._parseAndSerializeCss(logger, baseUri, value);
      } else {
        css = await DomCapture._downloadCss(logger, baseUri, value);
      }
      // stopwatch.Reset();
      // stopwatch.Start();
      sb.write(css);
      // logger.Verbose("appending CSS to StringBuilder took {0} ms", stopwatch.Elapsed.TotalMilliseconds);
    }
    return sb.toString();
  }

  /**
   *
   * @param logger
   * @param baseUri
   * @param css
   * @return {Promise<string>}
   * @private
   */
  static async _parseAndSerializeCss(logger, baseUri, css) {
    // Stopwatch stopwatch = Stopwatch.StartNew();
    const parser = new Parser();
    const stylesheet = parser.Parse(css);
    // logger.Verbose("parsing CSS string took {0} ms", stopwatch.Elapsed.TotalMilliseconds);

    css = DomCapture._serializeCss(logger, baseUri, stylesheet);
    return css;
  }

  static async _serializeCss(logger, baseUri, stylesheet) {
    // Stopwatch stopwatch = Stopwatch.StartNew();
    let sb = new Buffer('');

    for (const ruleSet of stylesheet.Rules) {
      let addAsIs = true;
      if (ruleSet.RuleType == CssParser.Model.RuleType.Import) {
        logger.verbose("encountered @import rule");
        const href = ruleSet.Href;
        let css = DomCapture._downloadCss(logger, baseUri, href);
        css = css.trim();
        logger.verbose("imported CSS (whitespaces trimmed) length: {0}", css.Length);
        addAsIs = css.Length === 0;
        if (!addAsIs) {
          css = await DomCapture._parseAndSerializeCss(logger, baseUri, css);
          sb.write(css);
        }
      }
      if (addAsIs) {
        sb.write(ruleSet.toString());
      }
    }

    // logger.Verbose("serializing CSS to StringBuilder took {0} ms", stopwatch.Elapsed.TotalMilliseconds);

    return sb.toString();
  }

  static async _downloadCss(logger, baseUri, value) {
    try {
      logger.verbose("Given URL to download: {0}", value);
      let href = url.parse(value);
      if (!isAbsoluteUrl(href)) {
        href = url.resolve(baseUri, href.toString());
      }
      // Stopwatch stopwatch = Stopwatch.StartNew();

      const css = await request(href);
      // logger.verbose("downloading CSS in length of {0} chars took {1} ms", css.Length, stopwatch.Elapsed.TotalMilliseconds);
      return css;
    } catch (ex) {
      logger.verbose(ex.toString());
      return '';
    }
  }

}

module.exports = DomCapture;
