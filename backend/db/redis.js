const redis = require('redis');
require('dotenv').config();

const redisClient = redis.createClient({
    password: 'bMRVdbq7aGEPtcKlJuswFltgfIyWzGh6',
    socket: {
        host: 'redis-12541.c267.us-east-1-4.ec2.redns.redis-cloud.com',
        port: 12541
    }
});
  
  const connectRedis = async () => {
      try {
          await redisClient.connect();
          console.log('Connected to Redis Cloud');
      } catch (err) {
          console.error('Redis connection error:', err);
          process.exit(1); // Exit process if the connection fails
      }
  };
  
  module.exports = { redisClient, connectRedis };
  