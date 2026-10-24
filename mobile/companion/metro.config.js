const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.watchFolders = [
  path.resolve(__dirname, '../core'),
  path.resolve(__dirname, '../../packages/api/src'),
];
// Resolve native React from this isolated package, never the browser workspace runtime.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
// Dependencies may keep compatible nested packages, such as VirtualizedList.
// All React consumers live under this isolated package; shared core/API modules
// contain no React runtime imports.
config.resolver.disableHierarchicalLookup = false;
module.exports = config;
