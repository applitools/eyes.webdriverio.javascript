'use strict';

const {Location, RectangleSize, ArgumentGuard, GeneralUtils} = require('eyes.sdk');

const Frame = require('../frames/Frame');
const FrameChain = require('../frames/FrameChain');
const ScrollPositionProvider = require('../positioning/ScrollPositionProvider');
const WDIOJSExecutor = require('../WDIOJSExecutor');
const EyesWebElement = require('./EyesWebElement');
const TargetLocator = require('../TargetLocator');

/**
 * Wraps a target locator so we can keep track of which frames have been switched to.
 */
class EyesTargetLocator extends TargetLocator {

  /**
   * Initialized a new EyesTargetLocator object.
   *
   * @param {Logger} logger A Logger instance.
   * @param {EyesWebDriver} driver The WebDriver from which the targetLocator was received.
   * @param {Object} targetLocator The actual TargetLocator object.
   */
  constructor(logger, driver, targetLocator = null) {
    ArgumentGuard.notNull(logger, "logger");
    ArgumentGuard.notNull(driver, "driver");
    ArgumentGuard.notNull(targetLocator, "targetLocator");

    super(driver.webDriver);

    this._logger = logger;
    this._driver = driver;
    this._targetLocator = targetLocator;
    this._jsExecutor = new WDIOJSExecutor(driver);
    this._scrollPosition = new ScrollPositionProvider(this._logger, this._jsExecutor);
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * Schedules a command to switch the focus of all future commands to another
   * frame on the page. The target frame may be specified as one of the following:
   *
   * - A number that specifies a (zero-based) index into [window.frames](
   *   https://developer.mozilla.org/en-US/docs/Web/API/Window.frames).
   * - A string, which correspond to a `id` or `name` of element.
   * - A {@link WebElement} reference, which correspond to a `frame` or `iframe` DOM element.
   * - The `null` value, to select the topmost frame on the page. Passing `null`
   *   is the same as calling {@link #defaultContent defaultContent()}.
   *
   * @override
   * @param {number|string|WebElement|null} arg1 The frame locator.
   * @return {Promise.<EyesWebDriver>}
   */
  frame(arg1) {
    const that = this;
    if (!arg1) {
      that._logger.verbose("EyesTargetLocator.frame(null)");
      return that.defaultContent();
    }

    if (Number.isInteger(arg1)) {
      const frameIndex = arg1;
      that._logger.verbose(`EyesTargetLocator.frame(${frameIndex})`);
      // Finding the target element so and reporting it using onWillSwitch.
      that._logger.verbose("Getting frames list...");
      return that._driver.findElementsByCssSelector("frame, iframe").then(frames => {
        if (frameIndex > frames.length) {
          throw new TypeError(`Frame index [${frameIndex}] is invalid!`);
        }

        that._logger.verbose("Done! getting the specific frame...");
        that._logger.verbose("Done! Making preparations...");
        return that.willSwitchToFrame(frames[frameIndex]);
      }).then(() => {
        that._logger.verbose("Done! Switching to frame...");
        return that._driver.webDriver.frame(frameIndex);
      }).then(() => {
        that._logger.verbose("Done!");
        return that._driver;
      });
    }

    if (GeneralUtils.isString(arg1)) {
      const frameNameOrId = arg1;
      that._logger.verbose(`EyesTargetLocator.frame(${frameNameOrId})`);
      // Finding the target element so we can report it.
      // We use find elements(plural) to avoid exception when the element is not found.
      that._logger.verbose("Getting frames by name...");
      let frames;
      return that._driver.findElementsByName(frameNameOrId).then(framesByName => {
        if (framesByName.length === 0) {
          that._logger.verbose("No frames Found! Trying by id...");
          // If there are no frames by that name, we'll try the id
          return that._driver.findElementsById(frameNameOrId).then(framesById => {
            if (framesById.length === 0) {
              // No such frame, bummer
              throw new TypeError(`No frame with name or id '${frameNameOrId}' exists!`);
            }
            return framesById;
          });
        }
        return framesByName;
      }).then(frames_ => {
        frames = frames_;
        that._logger.verbose("Done! Making preparations...");
        return that.willSwitchToFrame(frames[0]);
      }).then(() => {
        that._logger.verbose("Done! Switching to frame...");
        let frameElement = frames[0];
        if (frameElement instanceof EyesWebElement) {
          frameElement = frameElement.getWebElement();
        }
        return that._driver.webDriver.frame(frameElement);
      }).then(() => {
        that._logger.verbose("Done!");
        return that._driver;
      });
    }

    let frameElement = arg1;
    that._logger.verbose("EyesTargetLocator.frame(element)");
    that._logger.verbose("Making preparations...");
    return that.willSwitchToFrame(frameElement).then(() => {
      that._logger.verbose("Done! Switching to frame...");
      if (frameElement instanceof EyesWebElement) {
        frameElement = frameElement.getWebElement();
      }
      return that._driver.webDriver.frame(frameElement);
    }).then(() => {
      that._logger.verbose("Done!");
      return that._driver;
    });
  }


  /**
   * Change focus to the parent context. If the current context is the top level browsing context, the context remains unchanged.
   *
   * @return {Promise.<EyesWebDriver>}
   */
  parentFrame() {
    const that = this;
    that._logger.verbose("EyesTargetLocator.parentFrame()");
    if (that._driver.getFrameChain().size() !== 0) {
      that._logger.verbose("Making preparations...");
      that._driver.getFrameChain().pop();
      that._logger.verbose("Done! Switching to parent frame..");

      // the command is not exists in selenium js sdk, we should define it manually
      that._driver.getExecutor().defineCommand('switchToParentFrame', 'POST', '/session/:sessionId/frame/parent');
      // noinspection JSCheckFunctionSignatures
      return that._driver.schedule(new command.Command('switchToParentFrame'), 'WebDriver.switchTo().parentFrame()').then(() => {
        that._logger.verbose("Done!");
        return that._driver;
      });
    }
    return that._driver.getPromiseFactory().resolve(that._driver);
  }

  /**
   * Switches into every frame in the frame chain. This is used as way to switch into nested frames (while considering scroll) in a single call.
   *
   * @param {FrameChain} frameChain The path to the frame to switch to.
   * @return {Promise.<EyesWebDriver>} The WebDriver with the switched context.
   */
  framesDoScroll(frameChain) {
    const that = this;
    this._logger.verbose("EyesTargetLocator.framesDoScroll(frameChain)");
    return that._driver.switchTo().defaultContent().then(() => {
      return frameChain.frames.reduce((promise, frame) => {
        return promise.then(() => {
          that._logger.verbose("Scrolling by parent scroll position...");
          const frameLocation = frame.getLocation();
          return that._scrollPosition.setPosition(frameLocation);
        }).then(() => {
          that._logger.verbose("Done! Switching to frame...");
          return that._driver.webDriver.frame(frame.reference);
        }).then(() => {
          that._logger.verbose("Done!");
        });
      }, that._driver.getPromiseFactory().resolve());
    }).then(() => {
      that._logger.verbose("Done switching into nested frames!");
      return that._driver;
    });
  }

  /**
   * Switches into every frame in the frame chain. This is used as way to switch into nested frames (while considering scroll) in a single call.
   *
   * @param {FrameChain|string[]} obj The path to the frame to switch to. Or the path to the frame to check. This is a list of frame names/IDs (where each frame is nested in the previous frame).
   * @return {Promise.<EyesWebDriver>} The WebDriver with the switched context.
   */
  frames(obj) {
    const that = this;
    if (obj instanceof FrameChain) {
      const frameChain = obj;
      that._logger.verbose("EyesTargetLocator.frames(frameChain)");
      return that._driver.switchTo().defaultContent().then(() => {
        return frameChain.frames.reduce((promise, frame) => {
          return promise.then(() => that._driver.switchTo().frame(frame.reference));
        }, that._driver.getPromiseFactory().resolve());
      }).then(() => {
        that._logger.verbose("Done switching into nested frames!");
        return that._driver;
      });
    } else if (Array.isArray(obj)) {
      that._logger.verbose("EyesTargetLocator.frames(framesPath)");
      return obj.reduce((promise, frameNameOrId) => {
        return promise.then(() => {
          that._logger.verbose("Switching to frame...");
          return that._driver.switchTo().frame(frameNameOrId);
        }).then(() => {
          that._logger.verbose("Done!");
        });
      }, that._driver.getPromiseFactory().resolve()).then(() => {
        that._logger.verbose("Done switching into nested frames!");
        return that._driver;
      });
    }
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * Schedules a command to switch the focus of all future commands to another window.
   * Windows may be specified by their {@code window.name} attribute or by its handle.
   *
   * @override
   * @param {string} nameOrHandle The name or window handle of the window to switch focus to.
   * @return {Promise.<EyesWebDriver>}
   */
  async window(nameOrHandle) {
    try {
      this._logger.verbose("EyesTargetLocator.window()");
      this._driver.frameChain.clear();
      this._logger.verbose("Done! Switching to window...");
      await this._driver.webDriver.window(nameOrHandle);
      return this._driver;
    } finally {
      this._logger.verbose("Done!");
    }
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * Schedules a command to switch focus of all future commands to the topmost frame on the page.
   *
   * @override
   * @return {Promise.<EyesWebDriver>}
   */
  async defaultContent() {
    this._logger.verbose("EyesTargetLocator.defaultContent()");
    if (this._driver.frameChain.size() !== 0) {
      this._logger.verbose("Making preparations...");
      this._driver.frameChain.clear();
      this._logger.verbose("Done! Switching to default content...");
      await this._targetLocator.defaultContent();
      this._logger.verbose("Done!");
    }
    return this._driver.getPromiseFactory().resolve(this._driver);
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * Schedules a command retrieve the {@code document.activeElement} element on the current document,
   * or {@code document.body} if activeElement is not available.
   *
   * @override
   * @return {!EyesWebElement}
   */
  activeElement() {
    this._logger.verbose("EyesTargetLocator.activeElement()");
    this._logger.verbose("Switching to element...");
    // noinspection JSCheckFunctionSignatures
    const id = this._driver.schedule(new command.Command(command.Name.GET_ACTIVE_ELEMENT), 'WebDriver.switchTo().activeElement()');
    this._logger.verbose("Done!");
    return new EyesWebElement(this._logger, this._driver, id);
  }

  /**
   * Schedules a command to change focus to the active modal dialog, such as those opened by `window.alert()`, `window.confirm()`, and `window.prompt()`.
   * The returned promise will be rejected with a {@linkplain error.NoSuchAlertError} if there are no open alerts.
   *
   * @return {!AlertPromise} The open alert.
   */
  alert() {
    this._logger.verbose("EyesTargetLocator.alert()");
    this._logger.verbose("Switching to alert...");
    const result = this._targetLocator.alert();
    this._logger.verbose("Done!");
    return result;
  }

  /**
   * Will be called before switching into a frame.
   *
   * @param {WebElement} targetFrame The element about to be switched to.
   * @return {Promise}
   */
  willSwitchToFrame(targetFrame) {
    ArgumentGuard.notNull(targetFrame, "targetFrame");

    this._logger.verbose("willSwitchToFrame()");
    this._logger.verbose("Frame");

    const eyesFrame = (targetFrame instanceof EyesWebElement) ? targetFrame : new EyesWebElement(this._logger, this._driver, targetFrame);

    const that = this;
    let location, elementSize, clientSize, contentLocation, originalLocation;
    return eyesFrame.getLocation().then(pl => {
      location = new Location(pl);
    }).then(() => {
      return eyesFrame.getSize().then(ds => {
        elementSize = new RectangleSize(ds);
      });
    }).then(() => {
      return eyesFrame.getClientWidth().then(clientWidth => {
        return eyesFrame.getClientHeight().then(clientHeight => {
          clientSize = new RectangleSize(clientWidth, clientHeight);
        });
      });
    }).then(() => {
      return eyesFrame.getComputedStyleInteger("border-left-width").then(borderLeftWidth => {
        return eyesFrame.getComputedStyleInteger("border-top-width").then(borderTopWidth => {
          contentLocation = new Location(location.getX() + borderLeftWidth, location.getY() + borderTopWidth);
        });
      });
    }).then(() => {
      return that._scrollPosition.getCurrentPosition().then(location => {
        originalLocation = location;
      });
    }).then(() => {
      const frame = new Frame(that._logger, targetFrame, contentLocation, elementSize, clientSize, originalLocation);
      that._driver.getFrameChain().push(frame);
    });
  }
}

module.exports = EyesTargetLocator;
