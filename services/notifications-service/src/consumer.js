const amqp = require("amqplib");
const { insertNotification } = require("./db");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
const QUEUE = process.env.RABBITMQ_QUEUE || "notifications.file_uploaded";

// Evento A
const EVENT_READY = "project.file.ready";

async function startConsumer() {
  const conn = await amqp.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();

  await channel.assertQueue(QUEUE, { durable: true });
  channel.prefetch(10);

  console.log(`RabbitMQ consumer connected. Queue=${QUEUE}`);

  channel.consume(
    QUEUE,
    async (msg) => {
      if (!msg) return;

      try {
        const raw = msg.content.toString("utf-8");
        const payload = JSON.parse(raw);

        const userId = payload.userId;
        if (!userId) {
          console.warn("Skipping message without userId:", payload);
          channel.ack(msg);
          return;
        }

        // ✅ Só cria notificação para o motivo A
        const event = payload.event || null;
        if (event !== EVENT_READY) {
          channel.ack(msg);
          return;
        }

        const title = "Ficheiro disponível ✅";

        const filePart = payload.originalName
          ? `O ficheiro "${payload.originalName}"`
          : "O ficheiro";

        const projectPart = payload.projectId
          ? ` no projeto ${payload.projectId}`
          : "";

        const message = `${filePart} ficou disponível${projectPart}.`;

        await insertNotification({
          userId,
          type: payload.type || "PROJECT_FILE_READY",
          title,
          message,
          data: payload,
        });

        channel.ack(msg);
      } catch (err) {
        console.error("Failed to process message:", err);
        // requeue
        channel.nack(msg, false, true);
      }
    },
    { noAck: false },
  );
}

module.exports = { startConsumer };
