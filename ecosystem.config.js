module.exports = {
  apps: [
    {
      name: 'serpely-api',
      script: './server/dist/index.js',
      cwd: '/var/www/Serpely',
      instances: 1,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
