/* eslint-disable no-restricted-syntax, no-await-in-loop */
//
import { flattenArray, getArrayChunks } from 'utils/Array';

const sequentialPromiseMap = async (array, asyncFn, chunkSize) => {
  const results = [];
  let i = 0;

  const chunked = chunkSize ? getArrayChunks(array, chunkSize) : array;

  while (i < chunked.length) {
    const res = await asyncFn(chunked[i]); // eslint-disable-line no-await-in-loop
    results.push(res);

    i += 1;
  }

  return chunkSize ? flattenArray(results) : results;
};

const sequentialPromiseFlatMap = async (array, asyncFn, chunkSize) => (
  flattenArray(await sequentialPromiseMap(array, asyncFn, chunkSize))
);

export { sequentialPromiseMap, sequentialPromiseFlatMap };
