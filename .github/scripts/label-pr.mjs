import { readFile } from "node:fs/promises";

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;

if (!event.pull_request || !repository || !token) {
  throw new Error("Missing pull request event or GitHub Actions environment variables");
}

const managedLabels = new Set([
  "breaking",
  "feature",
  "fix",
  "performance",
  "documentation",
  "maintenance",
  "scope: core",
  "scope: react",
  "scope: vue",
  "scope: svelte",
  "scope: docs",
  "scope: ci",
]);
const desiredLabels = new Set();
const title = event.pull_request.title.trim();
const body = event.pull_request.body ?? "";
const conventionalTitle = /^(?<type>[a-z]+)(?:\([^)]+\))?(?<breaking>!)?:/i.exec(title);

if (conventionalTitle?.groups) {
  const typeLabels = {
    feat: "feature",
    fix: "fix",
    perf: "performance",
    docs: "documentation",
    build: "maintenance",
    chore: "maintenance",
    ci: "maintenance",
    refactor: "maintenance",
    revert: "maintenance",
    test: "maintenance",
  };
  const typeLabel = typeLabels[conventionalTitle.groups.type.toLowerCase()];
  if (typeLabel) desiredLabels.add(typeLabel);
  if (conventionalTitle.groups.breaking) desiredLabels.add("breaking");
}

if (/^BREAKING[ -]CHANGE:/m.test(body)) desiredLabels.add("breaking");

const api = async (path, init = {}) => {
  const response = await fetch(`${process.env.GITHUB_API_URL}/repos/${repository}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`${init.method ?? "GET"} ${path} failed: ${response.status} ${message}`);
  }

  return response.status === 204 ? undefined : response.json();
};

const pageCount = Math.max(1, Math.ceil(event.pull_request.changed_files / 100));
const filePages = await Promise.all(
  Array.from({ length: pageCount }, (_, index) =>
    api(`/pulls/${event.pull_request.number}/files?per_page=100&page=${index + 1}`),
  ),
);
const files = filePages.flat();

for (const { filename } of files) {
  if (filename.startsWith("packages/core/")) desiredLabels.add("scope: core");
  if (filename.startsWith("packages/react/")) desiredLabels.add("scope: react");
  if (filename.startsWith("packages/vue/")) desiredLabels.add("scope: vue");
  if (filename.startsWith("packages/svelte/")) desiredLabels.add("scope: svelte");
  if (
    filename.startsWith("apps/docs/") ||
    filename.startsWith("docs/") ||
    filename === "README.md" ||
    filename.endsWith("/README.md")
  ) {
    desiredLabels.add("scope: docs");
  }
  if (filename.startsWith(".github/") || filename === ".github/release.yml") {
    desiredLabels.add("scope: ci");
  }
}

const currentLabels = await api(`/issues/${event.pull_request.number}/labels?per_page=100`);
await Promise.all(
  currentLabels
    .filter(({ name }) => managedLabels.has(name) && !desiredLabels.has(name))
    .map(({ name }) =>
      api(`/issues/${event.pull_request.number}/labels/${encodeURIComponent(name)}`, {
        method: "DELETE",
      }),
    ),
);

if (desiredLabels.size > 0) {
  await api(`/issues/${event.pull_request.number}/labels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ labels: [...desiredLabels] }),
  });
}

console.log(`Applied labels: ${[...desiredLabels].join(", ") || "none"}`);
