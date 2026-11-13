// Compte rendu des tests (principe IV) : lit les rapports JSON de Vitest, de la couverture v8
// et de Playwright, puis écrit test-results/report.md. Sort toujours en code 0 : un rapport
// manquant est signalé dans le compte rendu, pas par un échec du script.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT = "test-results/report.md";

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function vitestSummary(report) {
  if (!report) return null;
  return {
    passed: report.numPassedTests ?? 0,
    failed: report.numFailedTests ?? 0,
    skipped: (report.numPendingTests ?? 0) + (report.numTodoTests ?? 0),
  };
}

function playwrightSummary(report) {
  if (!report) return null;
  const stats = report.stats ?? {};
  return {
    passed: stats.expected ?? 0,
    failed: (stats.unexpected ?? 0) + (stats.flaky ?? 0),
    skipped: stats.skipped ?? 0,
  };
}

function pct(metric) {
  return metric && typeof metric.pct === "number" ? `${metric.pct.toFixed(1)} %` : "n/d";
}

const vitest = vitestSummary(readJson("test-results/vitest.json"));
const coverage = readJson("coverage/coverage-summary.json")?.total ?? null;
const playwright = playwrightSummary(readJson("test-results/playwright.json"));

const row = (name, s, file) =>
  s
    ? `| ${name} | ${s.passed} | ${s.failed} | ${s.skipped} | ${s.failed === 0 ? "✅" : "❌"} |`
    : `| ${name} | – | – | – | ⚠️ rapport absent (\`${file}\`) |`;

const lines = [
  "### Compte rendu des tests",
  "",
  "- **Commande** : `npm run test:all` (`npm test` puis `npm run test:e2e`)",
  `- **Date** : ${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC`,
  "",
  "| Suite | Réussis | Échoués | Ignorés | Statut |",
  "|---|---|---|---|---|",
  row("Unitaires (Vitest)", vitest, "test-results/vitest.json"),
  row("Bout en bout (Playwright)", playwright, "test-results/playwright.json"),
  "",
  coverage
    ? `**Couverture** (\`src/lib\`, \`src/pages/api\`) : lignes ${pct(coverage.lines)}, branches ${pct(coverage.branches)}, fonctions ${pct(coverage.functions)}`
    : "**Couverture** : ⚠️ rapport absent (`coverage/coverage-summary.json`)",
  "",
];

mkdirSync("test-results", { recursive: true });
writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(lines.join("\n"));
process.exit(0);
