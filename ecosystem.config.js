module.exports = {
  apps: [
    {
      name: "code-generator",
      script: "./.output/server/index.mjs",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
