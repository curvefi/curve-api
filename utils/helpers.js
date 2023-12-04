const getThursdayUTCTimestamp = async () => {
  let ts = new Date().getTime();
  let week = 604800;
  return Math.floor((ts / 1000) / week) * week
};

export {
  getThursdayUTCTimestamp
};
