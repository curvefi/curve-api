import { flattenArray, getArrayChunks } from '#root/utils/Array.js';

const sleep = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

const sleepUntil = async (conditionFn, checkInterval = 200) => {
  if (typeof conditionFn !== 'function') {
    throw new Error('sleepUntil expects a function as first argument');
  }

  while (!conditionFn()) {
    await sleep(checkInterval);
  }
};

const sequentialPromiseMap = async (array, asyncFn, chunkSize) => {
  const results = [];
  let i = 0;

  const chunked = chunkSize ? getArrayChunks(array, chunkSize) : array;

  while (i < chunked.length) {
    const res = await asyncFn(chunked[i], i); // eslint-disable-line no-await-in-loop
    results.push(res);

    i += 1;
  }

  return chunkSize ? flattenArray(results) : results;
};

const sequentialPromiseFlatMap = async (array, asyncFn, chunkSize) => (
  flattenArray(await sequentialPromiseMap(array, asyncFn, chunkSize))
);

const sequentialPromiseReduce = async (array, asyncFn) => {
  const results = [];
  let i = 0;

  while (i < array.length) {
    const res = await asyncFn(array[i], i, results); // eslint-disable-line no-await-in-loop
    results.push(res);

    i += 1;
  }

  return results;
};

const runConcurrentlyAtMost = async (asyncFns, atMost) => {
  const runningPromises = new Set();
  const values = [];

  for (const asyncFn of asyncFns) {
    while (runningPromises.size >= atMost) {
      await Promise.race(runningPromises);
      await sleep(0); // Politely let Promise.race yield to the rest of its code first
    }

    const promise = asyncFn()
      .then((value) => {
        values.push(value);
        runningPromises.delete(promise);
      });

    runningPromises.add(promise);
  }

  // runningPromises is a dynamic iterable, so make sure Promise.all only resolves
  // once all dynamically-added promises have
  while (runningPromises.size) {
    await Promise.all(runningPromises); // Wait for all requests to finish
  }

  return values;
};

export {
  sequentialPromiseMap,
  sequentialPromiseFlatMap,
  sequentialPromiseReduce,
  sleepUntil,
  sleep,
  runConcurrentlyAtMost,
};
