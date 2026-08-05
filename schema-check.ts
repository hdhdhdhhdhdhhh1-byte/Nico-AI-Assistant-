import { getDatabase } from "./src/packages/knowledge/Database";

async function main() {
  const db = await getDatabase();

  const r = db.exec("PRAGMA table_info(knowledge)");

  console.log(JSON.stringify(r, null, 2));
}

main();
