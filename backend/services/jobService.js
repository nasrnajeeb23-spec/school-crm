const { Job } = require('../models');

let redisClient = null;

const setRedisClient = (client) => {
    redisClient = client;
};

const enqueueJob = (name, payload, executor) => {
    const id = 'job_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    Job.create({ id, name, status: 'queued', schoolId: Number(payload.schoolId || 0) }).catch(() => { });

    setImmediate(async () => {
        try {
            await Job.update({ status: 'running', updatedAt: new Date() }, { where: { id } });
            const result = await executor(payload);
            await Job.update({ status: 'completed', updatedAt: new Date() }, { where: { id } });

            if (redisClient) {
                if (result && result.csv) await redisClient.setEx(`job:${id}:csv`, 3600, result.csv.toString());
                if (result && result.zip) await redisClient.setEx(`job:${id}:zip`, 3600, result.zip.toString('base64'));
            }
        } catch (e) {
            await Job.update({ status: 'failed', updatedAt: new Date() }, { where: { id } }).catch(() => { });
        }
    });
    return id;
};

module.exports = {
    setRedisClient,
    enqueueJob
};
