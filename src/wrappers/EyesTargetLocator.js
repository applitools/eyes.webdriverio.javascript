'use strict';

const {Location, RectangleSize, ArgumentGuard, GeneralUtils} = require('@applitools/eyes.sdk.core');

const Frame = require('../frames/Frame');
const FrameChain = require('../frames/FrameChain');
const ScrollPositionProvider = require('../positioning/ScrollPositionProvider');
const WDIOJSExecutor = require('../WDIOJSExecutor');
const EyesWebElement = require('./EyesWebElement');
const TargetLocator = require('../TargetLocator');
const WebElement = require('./WebElement');

/**
 * Wraps a target locator so we can keep track of which frames have been switched to.
 */
class EyesTargetLocator extends TargetLocator {

  /**
   * Initialized a new EyesTargetLocator object.
   *
   * @param {Logger} logger A Logger instance.
   * @param {EyesWebDriver} driver The WebDriver from which the targetLocator was received.
   * @param {TargetLocator} targetLocator The actual TargetLocator object.
   */
  constructor(logger, driver, targetLocator = null) {
    ArgumentGuard.notNull(logger, "logger");
    ArgumentGuard.notNull(driver, "driver");
    ArgumentGuard.notNull(targetLocator, "targetLocator");

    super(driver.webDriver);

    this._logger = logger;
    this._tsInstance = driver;
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
   * @param {number|string|WebElement|EyesWebElement|null} [arg1] The frame locator.
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
      return that._tsInstance.findElementsByCssSelector("frame, iframe").then(frames => {
        if (frameIndex > frames.length) {
          throw new TypeError(`Frame index [${frameIndex}] is invalid!`);
        }

        that._logger.verbose("Done! getting the specific frame...");
        that._logger.verbose("Done! Making preparations...");
        return that.willSwitchToFrame(frames[frameIndex]);
      }).then(() => {
        that._logger.verbose("Done! Switching to frame...");
        return that._targetLocator.frame(frameIndex);
      }).then(() => {
        that._logger.verbose("Done!");
        return that._tsInstance;
      });
    }

    if (GeneralUtils.isString(arg1)) {
      const frameNameOrId = arg1;
      that._logger.verbose(`EyesTargetLocator.frame(${frameNameOrId})`);
      // Finding the target element so we can report it.
      // We use find elements(plural) to avoid exception when the element is not found.
      that._logger.verbose("Getting frames by name...");
      let frames;
      return that._tsInstance.findElementsByName(frameNameOrId).then(framesByName => {
        if (framesByName.length === 0) {
          that._logger.verbose("No frames Found! Trying by id...");
          // If there are no frames by that name, we'll try the id
          return that._tsInstance.findElementsById(frameNameOrId).then(framesById => {
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
        return that._targetLocator.frame(frameElement.element);
      }).then(() => {
        that._logger.verbose("Done!");
        return that._tsInstance;
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
      return that._targetLocator.frame(frameElement.element);
    }).then(() => {
      that._logger.verbose("Done!");
      return that._tsInstance;
    });
  }


  /**
   * Change focus to the parent context. If the current context is the top level browsing context, the context remains unchanged.
   *
   * @return {Promise.<EyesWebDriver>}
   */
  parentFrame() {
    const that = this;
    this._logger.verbose("EyesTargetLocator.parentFrame()");
    if (this._tsInstance.getFrameChain().size() !== 0) {
      this._logger.verbose("Making preparations...");
      this._tsInstance.getFrameChain().pop();
      this._logger.verbose("Done! Switching to parent frame..");
      return this._tsInstance.remoteWebDriver.frameParent().then(()=>{
        that._logger.verbose("Done!");
        return that._tsInstance;
      });
    } else {
      return this._tsInstance.getPromiseFactory().resolve(this._tsInstance);
    }
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
    return that._tsInstance.switchTo().defaultContent().then(() => {
      return frameChain.getFrames().reduce((promise, frame) => {
        return promise.then(() => {
          that._logger.verbose("Scrolling by parent scroll position...");
          const frameLocation = frame.getLocation();
          return that._scrollPosition.setPosition(frameLocation);
        }).then(() => {
          that._logger.verbose("Done! Switching to frame...");
          return that._tsInstance.switchTo().frame(frame.getReference());
        }).then(() => {
          that._logger.verbose("Done!");
        });
      }, that._tsInstance.getPromiseFactory().resolve());
    }).then(() => {
      that._logger.verbose("Done switching into nested frames!");
      return that._tsInstance;
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
      return that._tsInstance.switchTo().defaultContent().then(() => {
        return frameChain.getFrames().reduce((promise, frame) => {
          return promise.then(() => that._tsInstance.switchTo().frame(frame.getReference()));
        }, that._tsInstance.getPromiseFactory().resolve());
      }).then(() => {
        that._logger.verbose("Done switching into nested frames!");
        return that._tsInstance;
      });
    } else if (Array.isArray(obj)) {
      that._logger.verbose("EyesTargetLocator.frames(framesPath)");
      return obj.reduce((promise, frameNameOrId) => {
        return promise.then(() => {
          that._logger.verbose("Switching to frame...");
          return that._tsInstance.switchTo().frame(frameNameOrId);
        }).then(() => {
          that._logger.verbose("Done!");
        });
      }, that._tsInstance.getPromiseFactory().resolve()).then(() => {
        that._logger.verbose("Done switching into nested frames!");
        return that._tsInstance;
      });
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Schedules a command to switch the focus of all future commands to another window.
   * Windows may be specified by their {@code window.name} attribute or by its handle.
   *
   * @override
   * @param {string} nameOrHandle The name or window handle of the window to switch focus to.
   * @return {Promise.<EyesWebDriver>}
   */
  window(nameOrHandle) {
    const that = this;
    that._logger.verbose("EyesTargetLocator.window()");
    that._tsInstance.getFrameChain().clear();
    that._logger.verbose("Done! Switching to window...");
    return that._targetLocator.window(nameOrHandle).then(() => {
      that._logger.verbose("Done!");
      return that._tsInstance;
    });
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * Schedules a command to switch focus of all future commands to the topmost frame on the page.
   *
   * @override
   * @return {Promise.<EyesWebDriver>}
   */
  defaultContent() {
    const that = this;
    that._logger.verbose("EyesTargetLocator.defaultContent()");
    if (that._tsInstance.getFrameChain().size() !== 0) {
      that._logger.verbose("Making preparations...");
      that._tsInstance.getFrameChain().clear();
      that._logger.verbose("Done! Switching to default content...");
      return that._targetLocator.defaultContent().then(() => {
        that._logger.verbose("Done!");
      });
    }
    return that._tsInstance.getPromiseFactory().resolve(that._tsInstance);
  }

  // noinspection JSUnusedGlobalSymbols
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
    const element = this._tsInstance.remoteWebDriver.elementActive();
    // const element = this._tsInstance.schedule(new command.Command(command.Name.GET_ACTIVE_ELEMENT), 'WebDriver.switchTo().activeElement()');
    this._logger.verbose("Done!");
    return new EyesWebElement(this._logger, this._tsInstance, new WebElement(this._tsInstance.remoteWebDriver, element));
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
   * @param {WebElement|EyesWebElement} targetFrame The element about to be switched to.
   * @return {Promise}
   */
  willSwitchToFrame(targetFrame) {
    ArgumentGuard.notNull(targetFrame, "targetFrame");

    this._logger.verbose("willSwitchToFrame()");
    this._logger.verbose("Frame");

    const eyesFrame = (targetFrame instanceof EyesWebElement) ? targetFrame : new EyesWebElement(this._logger, this._tsInstance, targetFrame);

    const that = this;
    let location, elementSize, clientSize, contentLocation, originalLocation, originalOverflow;
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
      return eyesFrame.getOverflow().then(overflow => {
        originalOverflow = overflow;
      });
    }).then(() => {
      const frame = new Frame(that._logger, targetFrame, contentLocation, elementSize, clientSize, originalLocation, originalOverflow);
      that._tsInstance.getFrameChain().push(frame);
    });
  }
}

module.exports = EyesTargetLocator;
