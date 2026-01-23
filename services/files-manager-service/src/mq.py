# services/files-manager-service/src/mq.py

import os
import json
import aio_pika

RABBITMQ_URL = os.getenv("RABBITMQ_URL")

EXCHANGE_NAME = os.getenv("RABBITMQ_EXCHANGE", "events")
QUEUE_NAME = os.getenv("RABBITMQ_QUEUE", "notifications.file_uploaded")

# ✅ routing key default (para manter compatibilidade com o bind atual)
DEFAULT_ROUTING_KEY = os.getenv("RABBITMQ_ROUTING_KEY", "file.uploaded")

_connection = None
_channel = None
_exchange = None
_queue = None


async def mq_init():
    global _connection, _channel, _exchange, _queue

    if not RABBITMQ_URL:
        return

    if _connection and not _connection.is_closed:
        return

    _connection = await aio_pika.connect_robust(RABBITMQ_URL)

    _channel = await _connection.channel()
    await _channel.set_qos(prefetch_count=50)

    _exchange = await _channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )

    _queue = await _channel.declare_queue(
        QUEUE_NAME,
        durable=True,
    )

    # ✅ bind atual (mantém tudo a funcionar como já tens)
    await _queue.bind(_exchange, routing_key=DEFAULT_ROUTING_KEY)

    # ✅ bind extra opcional: se quiseres usar routing keys por evento no futuro,
    #    podes ligar aqui também (não faz mal estar ativo).
    # Ex.: aceitar project.file.ready como routing key
    await _queue.bind(_exchange, routing_key="project.file.ready")
    await _queue.bind(_exchange, routing_key="file.ready")


async def publish_file_uploaded(payload: dict, routing_key: str | None = None):
    if not RABBITMQ_URL:
        return

    try:
        if _exchange is None:
            await mq_init()

        msg = aio_pika.Message(
            body=json.dumps(payload).encode("utf-8"),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )

        # ✅ se não passarem routing_key, usa:
        # - payload["event"] se existir (permite topics por evento)
        # - senão DEFAULT_ROUTING_KEY (compat)
        rk = routing_key or payload.get("event") or DEFAULT_ROUTING_KEY

        await _exchange.publish(msg, routing_key=rk)

    except Exception:
        return
