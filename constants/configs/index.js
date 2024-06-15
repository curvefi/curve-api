import configs from './configs.js';
import validateConfigs from './init-validation.js';

validateConfigs(configs);

const getConfigByRpcUrl = (rpcUrl) => (
  Array.from(Object.entries(configs)).find(([, config]) => config.rpcUrl === rpcUrl)
);

export default configs;
export { getConfigByRpcUrl };
