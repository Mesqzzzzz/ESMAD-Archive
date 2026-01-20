require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Users service running on http://${HOST}:${PORT}`);
});
