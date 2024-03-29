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
  // TODO: use id instad of name Issue#24
  await channel.sendToQueue(env.QUEUE_NAME, Buffer.from(job.name));
  await channel.close()
}

export async function removeFromQueue(jobName: string) {
  const channel: amqplib.Channel = await connect();
  // iterate over all jobs in queue, only ack the right one
  // TODO: use id instead of name Issue#24 
  await channel.consume(env.QUEUE_NAME, async (message) => {
    if(message && message.content.toString() == jobName) {
      await channel.ack(message)
    }
  },
  {noAck: false}
  )
  await channel.close()
}