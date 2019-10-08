const core = require('@applitools/eyes-sdk-core');

exports.AccessibilityLevel = core.AccessibilityLevel;
exports.AccessibilityRegionType = core.AccessibilityRegionType;
exports.AccessibilityMatchSettings = core.AccessibilityMatchSettings;

exports.Eyes = require('./src/Eyes').Eyes;
exports.EyesWDIO = require('./src/EyesWDIO').EyesWDIO;
exports.EyesVisualGrid = require('./src/EyesVisualGrid').EyesVisualGrid;
exports.By = require('./src/By');
exports.Target = require('./src/fluent/Target');
exports.WebDriver = require('./src/wrappers/WebDriver');
exports.WebElement = require('./src/wrappers/WebElement');
exports.EyesWebDriver = require('./src/wrappers/EyesWebDriver');
exports.WebdriverioCheckSettings = require('./src/fluent/WebdriverioCheckSettings');
exports.EyesWDIOScreenshot = require('./src/capture/EyesWDIOScreenshot');
exports.EyesWDIOUtils = require('./src/EyesWDIOUtils');
exports.NetHelper = require('./src/services/NetHelper');
exports.StitchMode = require('./src/StitchMode');
exports.ClassicRunner = require('./src/runner/ClassicRunner').ClassicRunner;
exports.VisualGridRunner = require('./src/runner/VisualGridRunner').VisualGridRunner;
exports.Configuration = core.Configuration;
exports.ConsoleLogHandler = core.ConsoleLogHandler;
exports.BatchInfo = core.BatchInfo;
exports.BrowserType = core.BrowserType;
exports.DeviceName = core.DeviceName;
exports.ScreenOrientation = core.ScreenOrientation;
exports.Region = core.Region;
