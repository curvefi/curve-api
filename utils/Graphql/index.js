/**
 * Graphql wrapper that queries graphql as we normally would,
 * or falls back to simply returning fallback data if the
 * USE_FALLBACK_THEGRAPH_DATA flag is set to true.
 *
 * Signature: `request(endpoint, queryString, variables, fallbackDataFileName)`
 * If the third arg is omitted, will behave like it does w/o the wrapper.
 *
 * Use the flag FALLBACK_THEGRAPH_DATA_POPULATE_MODE to easily update
 * fallback data files’ contents by copy/pasting the latest json output.
 */

import { request, batchRequests, gql } from 'graphql-request';
import {
  USE_FALLBACK_THEGRAPH_DATA,
  FALLBACK_THEGRAPH_DATA_POPULATE_MODE,
} from '#root/constants/AppConstants.js'

const getFallbackData = async (fallbackDataFileName) => (
  (await import(`./_fallback-data/${fallbackDataFileName}.json`, { assert: { type: 'json' } })).default
);

const wrappedRequest = async (endpoint, queryString, variables, fallbackDataFileName) => {
  let data;

  if (USE_FALLBACK_THEGRAPH_DATA && typeof fallbackDataFileName !== 'undefined') {
    return getFallbackData(fallbackDataFileName);
  }

  try {
    data = await request(endpoint, gql`${queryString}`, variables);
  } catch (err) {
    if (typeof fallbackDataFileName !== 'undefined') {
      console.log(`CAUGHT AND HANDLED GRAPHQL ERROR: There was an error querying the following graphql endpoint: "${endpoint}". Fallback data was returned instead of fresh data. The caught error is logged below ↓`);
      console.log(err);

      data = await getFallbackData(fallbackDataFileName);
    } else {
      throw err;
    }
  }

  if (FALLBACK_THEGRAPH_DATA_POPULATE_MODE) {
    console.log(`FALLBACK_THEGRAPH_DATA_POPULATE_MODE for /fallback-data/${fallbackDataFileName}.json`, JSON.stringify(data));
  }

  return data;
};

const wrappedRequests = async (endpoint, queryStringAndVarArray, fallbackDataFileName) => {
  let data;

  if (USE_FALLBACK_THEGRAPH_DATA && typeof fallbackDataFileName !== 'undefined') {
    return getFallbackData(fallbackDataFileName);
  }

  console.log('queryStringAndVarArray', queryStringAndVarArray)
  console.log('queryStringAndVarArray.gql', queryStringAndVarArray.map(({
    document,
    variables,
  }) => ({
    document: gql`${document}`,
    variables,
  })))

  try {
    data = await batchRequests(endpoint, queryStringAndVarArray.map(({
      query,
      variables,
    }) => ({
      query: gql`${query}`,
      variables,
    })), fallbackDataFileName);
  } catch (err) {
    if (typeof fallbackDataFileName !== 'undefined') {
      console.log(`CAUGHT AND HANDLED GRAPHQL ERROR: There was an error querying the following graphql endpoint (batch query): "${endpoint}". Fallback data was returned instead of fresh data. The caught error is logged below ↓`);
      console.log(err);

      data = await getFallbackData(fallbackDataFileName);
    } else {
      throw err;
    }
  }

  if (FALLBACK_THEGRAPH_DATA_POPULATE_MODE) {
    console.log(`FALLBACK_THEGRAPH_DATA_POPULATE_MODE for /fallback-data/${fallbackDataFileName}.json`, JSON.stringify(data));
  }

  return data;
};

export {
  wrappedRequest as request,
  wrappedRequests as requests,
};
