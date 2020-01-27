'use strict';

const {Location, ImageProvider, MutableImage, Region, OSNames} = require('@applitools/eyes-sdk-core');

const ScrollPositionProvider = require('../positioning/ScrollPositionProvider');
const WDIOJSExecutor = require('../WDIOJSExecutor');


/**
 * @private
 * @ignore
 */
class DeviceData {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  hashCode() {
    return this.width * 100000 + this.height * 1000;
  }
}

class SafariScreenshotImageProvider extends ImageProvider {

  /**
   * @param {Eyes} eyes
   * @param {Logger} logger A Logger instance.
   * @param {EyesWebDriver} tsInstance
   * @param {UserAgent} userAgent
   */
  constructor(eyes, logger, tsInstance, userAgent) {
    super();

    this._eyes = eyes;
    this._logger = logger;
    this._tsInstance = tsInstance;
    this._userAgent = userAgent;

    /** @type {Map<int, [Region]>} */
    this._devicesRegions = undefined;
    this._jsExecutor = new WDIOJSExecutor(tsInstance);
  }

  /**
   * @override
   * @return {Promise.<MutableImage>}
   */
  async getImage() {
    this._logger.verbose('Getting screenshot as base64...');
    let screenshot64 = await this._tsInstance.takeScreenshot();
    screenshot64 = screenshot64.replace(/\r\n/g, ''); // Because of SauceLabs returns image with line breaks

    this._logger.verbose('Done getting base64! Creating MutableImage...');
    const image = new MutableImage(screenshot64);
    await this._eyes.getDebugScreenshotsProvider().save(image, 'SAFARI');

    if (this._eyes.getIsCutProviderExplicitlySet()) {
      return image;
    }

    const scaleRatio = this._eyes.getDevicePixelRatio();
    const originalViewportSize = await this._eyes.getViewportSize();
    const viewportSize = originalViewportSize.scale(scaleRatio);

    this._logger.verbose(`logical viewport size: ${originalViewportSize}`);

    if (this._userAgent.getOS() === OSNames.IOS) {
      if (!this._devicesRegions) {
        this._initDeviceRegionsTable();
      }

      const imageWidth = image.getWidth();
      const imageHeight = image.getHeight();

      this._logger.verbose(`physical device pixel size: ${imageWidth} x ${imageHeight}`);

      const deviceData = new DeviceData(imageWidth, imageHeight,);

      const resolutions = this._devicesRegions.get(deviceData.hashCode());

      if (resolutions) {
        const widthRatio = image.getWidth() / originalViewportSize.getWidth();
        const height = widthRatio * originalViewportSize.getHeight();

        if (Math.abs(height - image.getHeight()) > 1.5) {
          let bestMatchingRect = resolutions[0];
          let bestHeightDiff = Math.abs(bestMatchingRect.getHeight() - height);
          for (let i = 1; i < resolutions.length; i++) {
            const rect = resolutions[i];
            const heightDiff = Math.abs(rect.getHeight() - height);
            if (heightDiff < bestHeightDiff) {
              bestHeightDiff = heightDiff;
              bestMatchingRect = rect;
            }
          }
          this._logger.verbose("closest crop rect found: {0}", bestMatchingRect);

          await image.crop(bestMatchingRect);
        }
        else {
          this._logger.verbose("no crop needed. must be using chrome emulator.");
        }
      }
    } else if (!this._eyes.getForceFullPageScreenshot()) {
      const currentFrameChain = this._eyes.getDriver().getFrameChain();

      let loc;
      if (currentFrameChain.size() === 0) {
        const positionProvider = new ScrollPositionProvider(this._logger, this._jsExecutor);
        loc = await positionProvider.getCurrentPosition();
      } else {
        loc = currentFrameChain.getDefaultContentScrollPosition();
      }

      loc = new Location(Math.ceil(loc.getX() * scaleRatio), Math.ceil(loc.getY() * scaleRatio));

      await image.crop(new Region(loc.scale(scaleRatio), viewportSize));
    }

    return image;
  }

  _initDeviceRegionsTable() {
    this._devicesRegions = new Map();

    // In JS, we need to maintain object reference if we want to use object as a key of Map.
    // But if we use primitive type, we don't need to. So, we call `hashCode` method to convert class to primitive

    this._devicesRegions.set(new DeviceData(1536, 2048).hashCode(), [new Region(0, 141, 1536, 1907), new Region(0, 206, 1536, 1842), new Region(0, 129, 1536, 1919), new Region(0, 194, 1536, 1854)]);
    this._devicesRegions.set(new DeviceData(2048, 1536).hashCode(), [new Region(0, 141, 2048, 1395), new Region(0, 206, 2048, 1330), new Region(0, 129, 2048, 1407), new Region(0, 194, 2048, 1342)]);

    this._devicesRegions.set(new DeviceData(828, 1792).hashCode(), [new Region(0, 189, 828, 1436)]);
    this._devicesRegions.set(new DeviceData(1792, 828).hashCode(), [new Region(88, 101, 1616, 685)]);

    this._devicesRegions.set(new DeviceData(1242, 2688).hashCode(), [new Region(0, 283, 1242, 2155)]);
    this._devicesRegions.set(new DeviceData(2688, 1242).hashCode(), [new Region(132, 151, 2424, 1028)]);

    this._devicesRegions.set(new DeviceData(1125, 2436).hashCode(), [new Region(0, 283, 1125, 1903)]);
    this._devicesRegions.set(new DeviceData(2436, 1125).hashCode(), [new Region(132, 151, 2172, 930)]);

    this._devicesRegions.set(new DeviceData(1242, 2208).hashCode(), [new Region(0, 211, 1242, 1863), new Region(0, 193, 1242, 1882)]);
    this._devicesRegions.set(new DeviceData(2208, 1242).hashCode(), [new Region(0, 151, 2208, 1090), new Region(0, 231, 2208, 1010)]);

    this._devicesRegions.set(new DeviceData(750, 1334).hashCode(), [new Region(0, 141, 750, 1104), new Region(0, 129, 750, 1116)]);
    this._devicesRegions.set(new DeviceData(1334, 750).hashCode(), [new Region(0, 101, 1334, 648), new Region(0, 89, 1334, 660)]);

    this._devicesRegions.set(new DeviceData(640, 1136).hashCode(), [new Region(0, 129, 640, 918)]);
    this._devicesRegions.set(new DeviceData(1136, 640).hashCode(), [new Region(0, 89, 1136, 462)]);

    this._devicesRegions.set(new DeviceData(2048, 2732).hashCode(), [new Region(0, 141, 2048, 2591)]);
    this._devicesRegions.set(new DeviceData(2732, 2048).hashCode(), [new Region(0, 141, 2732, 1907)]);

    this._devicesRegions.set(new DeviceData(1668, 2224).hashCode(), [new Region(0, 141, 1668, 2083)]);
    this._devicesRegions.set(new DeviceData(2224, 1668).hashCode(), [new Region(0, 141, 2224, 1527)]);
  }

}

module.exports = SafariScreenshotImageProvider;
