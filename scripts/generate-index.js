import fs from "fs";
import path from "path";

const outputPublic = path.join(process.cwd(), ".output", "public");
const assetsDir = path.join(outputPublic, "assets");
const outputHtml = path.join(outputPublic, "index.html");

if (!fs.existsSync(assetsDir)) {
  console.error("[Capacitor Index Fix] Assets directory not found:", assetsDir);
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const jsFile = files.find((f) => f.startsWith("index-") && f.endsWith(".js"));
const cssFile = files.find((f) => f.startsWith("styles-") && f.endsWith(".css"));

if (!jsFile) {
  console.error("[Capacitor Index Fix] Main JS bundle not found in assets!");
  process.exit(1);
}

const cssLink = cssFile ? `<link rel="stylesheet" href="./assets/${cssFile}" />` : "";

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>Nico AI Assistant</title>
    ${cssLink}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./assets/${jsFile}"></script>
  </body>
</html>
`;

fs.writeFileSync(outputHtml, htmlContent, "utf-8");
console.log(`[Capacitor Index Fix] Generated ${outputHtml} pointing to assets/${jsFile} and assets/${cssFile || "none"}`);
