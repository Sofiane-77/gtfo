import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const sourceFile = path.join(distDir, "index.html");

const pages = [
  {
    route: "logs",
    url: "https://sofiane-77.github.io/gtfo/logs/",
    title: "GTFO Progress - Log Tracker",
    description:
      "Track your GTFO log progression and read all logs in one place. Mark collected logs, monitor completion and keep your progress organized.",
    keywords:
      "gtfo progress, gtfo log tracker, gtfo logs, gtfo log progression, gtfo player.log parser, gtfo log viewer, gtfo read all logs, achievement_readalllogs, D-Lock Block Decipherer, D-Lock Block Decipherer achievement, gtfo tools, track gtfo logs, gtfo log checklist",
    image: "https://sofiane-77.github.io/gtfo/images/og/logs.jpg",
  },
  {
    route: "r8a2",
    url: "https://sofiane-77.github.io/gtfo/r8a2/",
    title: "GTFO Progress - R8A2 Secondary Password",
    description:
      "Current GTFO R8A2 secondary password, updated weekly after the rundown reset. Unlock the R8A2 secondary objective instantly.",
    keywords:
      "gtfo progress, r8a2 password, r8a2 secondary, r8a2 secondary password, weekly r8a2 password, gtfo r8a2 password, gtfo tools, gtfo secondary password",
    image: "https://sofiane-77.github.io/gtfo/images/og/r8a2.jpg",
  },
];

function setMetaTag(html, selector, value) {
  return html.replace(selector, value);
}

function buildPageHtml(template, page) {
  let html = template;

  html = setMetaTag(html, /<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>`);
  html = setMetaTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${page.description}" />`,
  );
  html = setMetaTag(
    html,
    /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/,
    `<meta name="keywords" content="${page.keywords}" />`,
  );
  html = setMetaTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${page.url}" />`,
  );
  html = setMetaTag(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${page.url}" />`,
  );
  html = setMetaTag(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${page.title}" />`,
  );
  html = setMetaTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${page.description}" />`,
  );
  html = setMetaTag(
    html,
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${page.image}" />`,
  );
  html = setMetaTag(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${page.title}" />`,
  );
  html = setMetaTag(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${page.description}" />`,
  );
  html = setMetaTag(
    html,
    /<meta\s+property="twitter:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="twitter:url" content="${page.url}" />`,
  );
  html = setMetaTag(
    html,
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:image" content="${page.image}" />`,
  );

  return html;
}

async function generateRouteShells() {
  const template = await readFile(sourceFile, "utf8");

  await Promise.all(
    pages.map(async (page) => {
      const outDir = path.join(distDir, page.route);
      await mkdir(outDir, { recursive: true });
      const html = buildPageHtml(template, page);
      await writeFile(path.join(outDir, "index.html"), html, "utf8");
    }),
  );

  process.stdout.write(
    `Generated SEO route shells: ${pages.map((page) => `/${page.route}/`).join(", ")}\n`,
  );
}

generateRouteShells().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
