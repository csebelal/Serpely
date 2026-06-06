module.exports = {
  apps: [{
    name: 'serpely-api',
    script: './dist/index.js',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '500M',
  }]
};
