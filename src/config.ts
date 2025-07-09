// ../config.ts
export default () => ({
    database: {
        url: process.env.DATABASE_URL,
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://localhost',
        queue: process.env.RABBITMQ_QUEUE || 'wallet_queue',
    },
});
