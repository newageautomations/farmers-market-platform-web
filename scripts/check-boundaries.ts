import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
interface Package {
  name: string;
  dependencies?: Record<string, string>;
  exports?: unknown;
}
const packages = new Map<string, { root: string; manifest: Package }>();
for (const area of ['apps', 'packages'])
  for (const dir of readdirSync(area, { withFileTypes: true }).filter((item) =>
    item.isDirectory(),
  )) {
    const root = resolve(area, dir.name),
      manifest = JSON.parse(
        readFileSync(join(root, 'package.json'), 'utf8'),
      ) as Package;
    packages.set(manifest.name, { root, manifest });
  }
const allowed: Record<string, readonly string[]> = {
  '@market/config': [],
  '@market/theme': [],
  '@market/api': [],
  '@market/auth': ['@market/api'],
  '@market/storefront-core': ['@market/api', '@market/theme', '@market/config'],
  '@market/admin-core': ['@market/api', '@market/auth'],
  '@market/ui': ['@market/api'],
  '@market/storefront': [
    '@market/api',
    '@market/config',
    '@market/storefront-core',
    '@market/theme',
    '@market/ui',
  ],
  '@market/admin': [
    '@market/api',
    '@market/auth',
    '@market/admin-core',
    '@market/config',
    '@market/theme',
    '@market/ui',
  ],
};
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) =>
    ['node_modules', 'dist', '.astro'].includes(item.name)
      ? []
      : item.isDirectory()
        ? files(join(dir, item.name))
        : /\.(ts|tsx|astro)$/.test(item.name)
          ? [join(dir, item.name)]
          : [],
  );
}
for (const [name, pkg] of packages) {
  const direct = Object.keys(pkg.manifest.dependencies ?? {}).filter(
    (dependency) => dependency.startsWith('@market/'),
  );
  if (direct.some((dep) => !allowed[name]?.includes(dep)))
    throw new Error(`Illegal dependency in ${name}`);
  for (const file of files(pkg.root)) {
    const content = readFileSync(file, 'utf8');
    for (const match of content.matchAll(
      /(?:from\s*|import\s*\(?)["']([^"']+)["']/g,
    )) {
      const specifier = match[1]!;
      if (specifier.startsWith('@market/')) {
        const target = specifier.split('/').slice(0, 2).join('/');
        if (!direct.includes(target))
          throw new Error(`Undeclared package import ${specifier}: ${file}`);
        if (
          specifier.split('/').length > 2 &&
          !Object.hasOwn(
            (packages.get(target)?.manifest.exports ?? {}) as object,
            `./${specifier.split('/').slice(2).join('/')}`,
          )
        )
          throw new Error(`Private package import ${specifier}`);
      } else if (specifier.startsWith('.')) {
        const target = resolve(file, '..', specifier);
        if (relative(pkg.root, target).startsWith('..'))
          throw new Error(`Cross-package relative import: ${file}`);
      }
    }
    if (
      /\b(?:localStorage|sessionStorage)\b|dangerouslySetInnerHTML|postgres:\/\/|from ['"](?:pg|prisma|typeorm|@supabase)/.test(
        content,
      )
    )
      throw new Error(`Unsafe platform pattern: ${file}`);
  }
}
function visit(name: string, stack: string[], done: Set<string>) {
  if (stack.includes(name))
    throw new Error(`Circular package graph: ${[...stack, name].join(' -> ')}`);
  if (done.has(name)) return;
  for (const next of Object.keys(
    packages.get(name)?.manifest.dependencies ?? {},
  ).filter((dep) => packages.has(dep)))
    visit(next, [...stack, name], done);
  done.add(name);
}
const done = new Set<string>();
for (const name of packages.keys()) visit(name, [], done);
console.log(
  `Package graph and source boundaries valid (${packages.size} workspaces).`,
);
