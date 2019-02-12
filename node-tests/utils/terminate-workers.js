'use strict';

let ParallelApi = require('broccoli-babel-transpiler/lib/parallel-api');

module.exports = function terminateWorkerPool() {
  // shut down any workerpool that is running at this point
  let babelCoreVersion = ParallelApi.getBabelVersion();
  let workerPoolId = 'v2/broccoli-babel-transpiler/workerpool/babel-core-' + babelCoreVersion;
  let runningPool = process[workerPoolId];

  if (runningPool) {
    return runningPool.terminate()
      .then(() => {
        delete process[workerPoolId];
      });
  } else {
    return Promise.resolve();
  }
};
