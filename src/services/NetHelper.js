'use strict';

const https = require('https');


class NetHelper {


  static get(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          resolve(rawData);
        });
      }).on('error', (e) => {
        reject(e);
      })
    });
  }

}

module.exports = NetHelper;
