require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Projects service running on http://${HOST}:${PORT}`);
});
