/**
 * Interface to send requests – thin wrapper around Fetch
 *
 * send, get and post return a Promise that resolves with a Response object
 * from which can be retrieved Body's contents. They all receive the same params:
 *
 * @param {string} url
 * @param {object} [data] - any piece of data to send alongside the request
 * @param {object} [customSettings] - any additional options to pass to Fetch
 */

import formUrlEncoded from 'form-urlencoded';

class Request {
  static send(url, data = {}, customSettings = {}) {
    const defaultSettings = { method: 'GET' };
    const settings = Object.assign(defaultSettings, customSettings);

    switch (settings.method) {
      // Attach data as query string params for GET and HEAD requests
      case 'GET':
      case 'HEAD': {
        const queryStringData = formUrlEncoded(data);
        if (queryStringData) url += `?${queryStringData}`; // eslint-disable-line no-param-reassign
        break;
      }

      default:
        settings.body = JSON.stringify(data);
        settings.headers = {
          'Content-Type': 'application/json',
        };
        break;
    }

    // Throws if response status code outside of range 200-299
    return fetch(url, settings)
      .then((response) => {
        if (!response.ok) throw response;
        return response;
      });
  }

  static get(url, data, customSettings = {}) {
    return Request.send(url, data, Object.assign(customSettings, { method: 'GET' }));
  }

  static post(url, data, customSettings = {}) {
    return Request.send(url, data, Object.assign(customSettings, { method: 'POST' }));
  }

  static uploadFile(url, data, customSettings = {}) {
    const settings = Object.assign({ method: 'POST' }, customSettings);

    const formData = new FormData();
    Array.from(Object.entries(data)).forEach(([key, value]) => {
      formData.append(key, value);
    });

    settings.body = formData;

    return fetch(url, settings)
      .then((response) => {
        if (!response.ok) throw response; // Throws if response status code outside of range 200-299
        return response;
      });
  }
}

export default Request;
