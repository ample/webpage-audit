/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('next').NextConfig} */

const path = require('path');

module.exports = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve ??= {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@components': path.join(__dirname, 'src/components'),
      '@lib': path.join(__dirname, 'src/lib'),
    };
    return config;
  },
};
