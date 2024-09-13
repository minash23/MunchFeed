module.exports = function(api) {
  api.cache(true);
  module.exports = function (api) {
      api.cache(true);
      return {
        presets: ['babel-preset-expo']
      };
  };
  return {
    presets: ['babel-preset-expo'],
    plugins: []
  };
};