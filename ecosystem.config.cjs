module.exports = {
  apps: [
    {
      name: 'valentine-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: './',
      watch: true,
      ignore_watch: ['node_modules', 'uploads', 'data'],
    },
    {
      name: 'valentine-backend',
      script: 'server.js',
      cwd: './',
      watch: true,
      ignore_watch: ['node_modules', 'src', 'uploads', 'data'],
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
