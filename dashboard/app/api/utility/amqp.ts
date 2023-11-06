import amqplib from "amqplib";
import { Job } from "../../../app/types/types";
import env from "./environment/config";

async function connect() {
  // Connects to the rabbitmq, returns the channel
  const conn = await amqplib.connect(env.RABBITMQ_URL);
  const ch1 = await conn.createChannel();
  await ch1.assertQueue(env.QUEUE_NAME);
  return ch1;
}

export async function pushToQueue(job: Job) {
  const channel: amqplib.Channel = await connect();
  await channel.sendToQueue(env.QUEUE_NAME, Buffer.from(job.name));
}
