module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      sentryDsn: process.env.SENTRY_DSN ?? "",
    },
  };
};
