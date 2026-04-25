export default {
  url: process.env.WATCHER_URL || `http://localhost:${process.env.WATCHER_PORT || 3001}/ingest`,
};
