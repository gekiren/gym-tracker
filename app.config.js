module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      sentryDsn: process.env.SENTRY_DSN ?? "https://c6b042033b77aab57ff1b3edc2bb2dcc@o4511505124425728.ingest.de.sentry.io/4511505138122832",
    },
  };
};
