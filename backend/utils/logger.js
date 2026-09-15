const pino = require('pino')

module.exports = function getLogger(prefix, logLevel = 'debug') {
  const isProd = process.env.NODE_ENV === 'production'

  return pino({
    level: logLevel,
    messageFormat: `[${prefix}]: {msg}`,
    transport: isProd
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            sync: true,
          },
        },
  })
}