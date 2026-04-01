import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const sourceFile = path.join(distDir, "index.html");

const pages = [
  {
    route: "",
    url: "https://sofiane-77.github.io/gtfo/",
    title: "GTFO Progress — Log Tracker & R8A2 Password",
    seoContent:
     "GTFO Progress is a GTFO log tracker and GTFO player.log parser designed to help you review GTFO logs, follow your GTFO log progression, and track achievement_readalllogs progress. You can read all logs, check what is still missing for the D-Lock Block Decipherer achievement, and find the current GTFO R8A2 password, including the weekly R8A2 password and R8A2 secondary password, in one place.",
    description:
      "Track your GTFO log progression and get the current weekly R8A2 secondary password.",
    keywords:
      "gtfo progress, gtfo log tracker, gtfo logs, gtfo log progression, gtfo player.log parser, gtfo read all logs, achievement_readalllogs, D-Lock Block Decipherer, D-Lock Block Decipherer achievement, r8a2 password, r8a2 secondary password, weekly r8a2 password, gtfo r8a2 password, gtfo tools",
    image: "https://sofiane-77.github.io/gtfo/images/og/home.jpg",
  },
  {
    route: "logs",
    url: "https://sofiane-77.github.io/gtfo/logs/",
    title: "GTFO Progress — Log Tracker",
    seoContent:
      "GTFO Progress helps you review GTFO logs and follow your GTFO log progression with a simple GTFO log tracker, GTFO log viewer, and GTFO player.log parser. You can track GTFO logs in one place, keep a clear GTFO log checklist, monitor GTFO read all logs completion for achievement_readalllogs, and see what is still missing for the D-Lock Block Decipherer achievement. It is an easy way to keep your progress organized while you play.",
    description:
      "GTFO Log Tracker: Track your GTFO log progression in one interactive terminal. Use commands to browse logs, mark collected ones, and monitor completion.",
    keywords:
      "gtfo progress, gtfo log tracker, gtfo logs, gtfo log progression, gtfo player.log parser, gtfo log viewer, gtfo read all logs, achievement_readalllogs, D-Lock Block Decipherer, D-Lock Block Decipherer achievement, gtfo tools, track gtfo logs, gtfo log checklist",
    image: "https://sofiane-77.github.io/gtfo/images/og/logs.jpg",
  },
  {
    route: "r8a2",
    url: "https://sofiane-77.github.io/gtfo/r8a2/",
    title: "GTFO Progress — R8A2 Secondary Password",
    seoContent:
      "GTFO Progress gives you the current GTFO R8A2 secondary password, updated after each rundown reset, so you can quickly check the latest weekly R8A2 password before your run. This page helps you find the R8A2 password, the GTFO R8A2 password, and the GTFO secondary password you need to unlock the R8A2 secondary objective in one place.",
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

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toRouteHref(fromRoute, toRoute) {
  if (fromRoute === toRoute) {
    return "./";
  }

  if (!fromRoute) {
    return toRoute ? `${toRoute}/` : "./";
  }

  if (!toRoute) {
    return "../";
  }

  return `../${toRoute}/`;
}

function buildInternalNav(currentPage) {
  const links = pages
    .filter((page) => page.route !== currentPage.route)
    .map(
      (page) =>
        `<li><a href="${toRouteHref(currentPage.route, page.route)}" title="${escapeHtml(page.title)}">${escapeHtml(page.title.replace('Progress — ', ''))}</a></li>`,
    )
    .join("");

  return `<nav aria-label="GTFO Progress internal navigation"><ul>${links}</ul></nav>`;
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
  html = setMetaTag(
    html,
    /<div\s+id="root"\s*>[\s\S]*?<\/div>/,
    `<div id="root"><h1>${escapeHtml(page.title.replace('Progress — ', ''))}</h1><p>${escapeHtml(page.seoContent)}</p>${buildInternalNav(page)}</div>`,
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
    `Generated SEO route shells: ${pages
      .map((page) => (page.route ? `/${page.route}/` : "/"))
      .join(", ")}\n`,
  );
}

generateRouteShells().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
