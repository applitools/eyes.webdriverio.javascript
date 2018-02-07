'use strict';

const Command = require('./Command');


class SeleniumService {

  constructor(driver) {
    this._driver = driver;
  }

  /**
   * @param cmd
   * returns {Promise}
   */
  async execute(cmd) {
    const requestHandler = this._driver.requestHandler;
    cmd.setParameter('sessionId', requestHandler.sessionID);

    const cmdPath = COMMAND_MAP.get(cmd.getName());
    const path = this.buildPath(cmdPath.path, cmd.getParameters());
    return requestHandler.create(path);
  }


  buildPath(path, parameters) {
    let pathParameters = path.match(/\/:(\w+)\b/g);
    if (pathParameters) {
      for (let i = 0; i < pathParameters.length; ++i) {
        let key = pathParameters[i].substring(2);  // Trim the /:
        if (key in parameters) {
          let value = parameters[key];
          path = path.replace(pathParameters[i], '/' + value);
          delete parameters[key];
        } else {
          throw new Error('Missing required parameter: ' + key);
        }
      }
    }
    return path;
  }


}

const COMMAND_MAP = new Map([
  [Command.Name.ELEMENT_EQUALS, {path: '/session/:sessionId/element/:id/equals/:other'}]

]);


module.exports = SeleniumService;
