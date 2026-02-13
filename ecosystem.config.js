module.exports = {
  apps: [
    {
      name: "autonomous_trader",
      script: "./autonomous_trader.js",
      watch: false,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "solana_trader",
      script: "./solana_trader.js",
      watch: false,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
