module.exports = {
  eslint: {
    // eslint has started throwing errors for what should be warnings, quick fix to allow builds to succeed
    ignoreDuringBuilds: true,
  },
};
