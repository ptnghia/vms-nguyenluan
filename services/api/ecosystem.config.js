module.exports = {
  apps: [{
    name: 'vms-api',
    script: './dist/main.js',
    cwd: '/home/camera/app/vms/services/api',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: 'postgresql://vms_user:l3Gd63G2iBlqtiWI@localhost:5432/vms',
      JWT_SECRET: 'vms-secret-key-change-in-production-2024',
      JWT_ACCESS_EXPIRY: '24h',
      JWT_REFRESH_EXPIRY: '7d',
      CORS_ORIGIN: '*',
      MEDIAMTX_HOST: '192.168.1.232',
      MEDIAMTX_PORT: 8888,
      MEDIAMTX_API_URL: 'http://localhost:9997'
    }
  }]
};
