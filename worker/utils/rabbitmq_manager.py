import pika
import logging

from config.environment import ConfigEntry


class RabbitManager():
    def __init__(self) -> None:
        self.queue = ConfigEntry.RABBITMQ_QUEUE
        self._connection = None,
        self._channel = None,
        self.deliveryTag = None,

    def _create_connection(self) -> pika.BlockingConnection:
        credentials = pika.PlainCredentials(
            ConfigEntry.RABBITMQ_USER, ConfigEntry.RABBITMQ_PASSWORD)
        self._connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=ConfigEntry.RABBITMQ_HOST,
                credentials=credentials,
                heartbeat=0
            )
        )
        self._channel = self._get_channel()
        self._channel.basic_qos(prefetch_count=1)  # Only pop 1 at a time

    def _get_channel(self):
        channel = self._connection.channel()
        channel.queue_declare(
            queue=ConfigEntry.RABBITMQ_QUEUE, durable=True)
        return channel

    def _consume(self, callback, ack: bool = False):
        self._channel.basic_consume(
            queue=self.queue,
            on_message_callback=callback,
            auto_ack=ack,
        )
        logging.info("Starting consuming.")
        self._channel.start_consuming()

    def consume(self, callback):
        self._create_connection()
        try:
            self._consume(callback=callback, ack=False)
        except pika.exceptions.ConnectionClosed:
            self._create_connection()
            self._consume(callback=callback, ack=False)
