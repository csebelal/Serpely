module.exports = {
  apps: [{
    name: 'serpely-api',
    script: './dist/index.js',
    node_args: '--max-old-space-size=1024',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '1500M',
  }]
};
