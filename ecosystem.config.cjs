module.exports = {
  apps: [
    {
      name: "Backend",
      script: "index.js",
      args: "--dev",

      // 🔥 Performance
      instances: 2,
      exec_mode: "cluster",

      // 🔄 Restart behavior
      autorestart: true,
      max_memory_restart: "1G",

      // 🕒 Logging
      time: true,
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true, // 👈 IMPORTANT

      watch: false,

      // env: {
      //   NODE_ENV: "development",
      // },
      // env_production: {
      //   NODE_ENV: "production",
      // },
    },
  ],
};