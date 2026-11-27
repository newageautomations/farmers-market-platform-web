/* eslint-disable @typescript-eslint/no-require-imports -- Workstation script uses the backend's pinned Sharp installation. */
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomBytes } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { gzipSync } = require('node:zlib');

const root = path.resolve(__dirname, '..');
const backend = path.resolve(root, '../farmers-market-platform');
const sharp = createRequire(path.join(backend, 'package.json'))('sharp');
const demo = process.argv[2] === '--demo';
const accountOrigin = demo
  ? 'http://auth.platform.localhost:4321'
  : 'https://staging-auth.farmerlane.com';
const adminOrigin = demo
  ? 'http://localhost:4322'
  : 'https://staging-admin.farmerlane.com';
const apiOrigin = demo
  ? 'http://localhost:3000'
  : 'https://staging-api.farmerlane.com';
const endpoint = apiOrigin + '/admin-api';
const assetPrefix = apiOrigin + '/assets/';
const digest = (bytes, algorithm = 'sha256') =>
  createHash(algorithm).update(bytes).digest('hex');

function sourceFromPreview(value) {
  if (typeof value !== 'string' || !value.startsWith(assetPrefix)) return;
  const file =
    /^preview\/[0-9a-f]{2}\/(storefront(?:__\d+)?)__preview(?:__\d+)?\.jpg$/.exec(
      value.slice(assetPrefix.length),
    );
  if (!file) return;
  const source = file[1] + '.jpg';
  return `source/${digest(source, 'md5').slice(0, 2)}/${source}`;
}

async function approvedBytes(row) {
  const base =
    row.folder === 'willow' ? 'willow-photos' : 'vendor-catalog/photos';
  const folder = path.join(root, '.runtime', base);
  const candidate = path.join(folder, row.filename);
  if (
    fs.realpathSync(candidate) !== candidate ||
    !fs.lstatSync(candidate).isFile() ||
    fs.statSync(candidate).size > 10_000_000
  )
    throw new Error('MEDIA_PATH_INVALID');
  const bytes = fs.readFileSync(candidate);
  if (digest(bytes) !== row.sha256) throw new Error('MEDIA_SOURCE_CHANGED');
  const image = sharp(bytes, {
    failOn: 'warning',
    limitInputPixels: 20_000_000,
  });
  const meta = await image.metadata();
  if (meta.format !== 'jpeg' || !meta.width || !meta.height || meta.pages > 1)
    throw new Error('MEDIA_SOURCE_INVALID');
  // Decode the whole image, orient it, and discard metadata during re-encoding.
  const approved = row.crop ? image.extract(row.crop) : image.rotate();
  const clean = await approved
    .resize({
      width: 1600,
      height: 1600,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 87 })
    .toBuffer();
  return { clean, sha256: digest(clean) };
}

async function api(query, variables, scope = {}, image) {
  const headers = {
    Origin: adminOrigin,
    ...(scope.auth && { Authorization: `Bearer ${scope.auth}` }),
    ...(scope.channel && { 'vendure-token': scope.channel }),
  };
  let body;
  if (image) {
    body = new FormData();
    body.set('operations', JSON.stringify({ query, variables }));
    body.set('map', '{"0":["variables.file"]}');
    body.set(
      '0',
      new Blob([image.bytes], { type: 'image/jpeg' }),
      image.filename,
    );
    headers['apollo-require-preflight'] = 'true';
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ query, variables });
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body,
    redirect: 'manual',
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`ADMIN_HTTP_${response.status}`);
  const result = await response.json();
  if (result.errors?.length || !result.data)
    throw new Error('ADMIN_OPERATION_REJECTED');
  return {
    data: result.data,
    auth: response.headers.get('vendure-auth-token'),
  };
}

async function signIn(account, password) {
  const correlation = randomBytes(32).toString('base64url');
  const destination =
    account.type === 'vendor' ? '/vendor/storefront' : '/market/storefront';
  const form = new URLSearchParams({
    action: 'unifiedLogin',
    email: account.email,
    password,
    origin: adminOrigin,
    correlation,
    destination,
  });
  const response = await fetch(accountOrigin + '/api/account', {
    method: 'POST',
    headers: { Origin: accountOrigin },
    body: form,
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`OWNER_SIGN_IN_HTTP_${response.status}`);
  const html = await response.text();
  const href = /<a href="([^"]+)">Continue<\/a>/.exec(html)?.[1];
  if (!href) throw new Error('OWNER_HANDOFF_MISSING');
  const callback = new URL(href.replaceAll('&amp;', '&'));
  const code = callback.searchParams.get('code');
  if (
    callback.origin !== adminOrigin ||
    callback.pathname !== '/auth/account' ||
    !/^[A-Za-z0-9_-]{43}$/.test(code ?? '')
  ) {
    throw new Error('OWNER_HANDOFF_INVALID');
  }
  const handoff = await api(
    'mutation($code:String!,$correlation:String!){exchangePlatformAdminHandoff(code:$code,correlation:$correlation)}',
    { code, correlation },
  );
  if (handoff.data.exchangePlatformAdminHandoff !== true || !handoff.auth)
    throw new Error('OWNER_SESSION_UNAVAILABLE');
  const {
    data: { me },
  } = await api(
    'query {me{identifier channels{id code token}}}',
    {},
    { auth: handoff.auth },
  );
  const channels = me?.channels.filter(
    (channel) => channel.code === account.channelCode,
  );
  if (me?.identifier !== account.email || channels?.length !== 1)
    throw new Error('OWNER_CHANNEL_CONFLICT');
  return { auth: handoff.auth, channel: channels[0].token };
}

async function listAssets(scope) {
  const result = [];
  for (let skip = 0; skip <= 10_000; skip += 100) {
    const { data } = await api(
      'query($skip:Int){ownBusinessProfileImageLibrary(skip:$skip)}',
      { skip },
      scope,
    );
    const rows = data.ownBusinessProfileImageLibrary;
    if (!Array.isArray(rows) || rows.length > 100)
      throw new Error('MEDIA_LIBRARY_UNAVAILABLE');
    for (const item of rows) {
      const source = sourceFromPreview(item.preview);
      if (source && /^[1-9][0-9]{0,9}$/.test(String(item.id)))
        result.push({ id: String(item.id), source });
    }
    if (rows.length < 100) return result;
  }
  throw new Error('MEDIA_LIBRARY_LIMIT');
}

async function contentHash(asset) {
  if (!/^source\/[0-9a-f]{2}\/storefront(?:__\d+)?\.jpg$/.test(asset.source)) {
    throw new Error('MEDIA_SOURCE_PATH_INVALID');
  }
  const response = await fetch(assetPrefix + asset.source, {
    redirect: 'manual',
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  if (
    !response.ok ||
    !response.headers.get('content-type')?.startsWith('image/jpeg') ||
    !response.body
  )
    throw new Error('MEDIA_SOURCE_READ_FAILED');
  const hash = createHash('sha256');
  let length = 0;
  for await (const bytes of response.body) {
    length += bytes.length;
    if (length > 10_000_000) throw new Error('MEDIA_SOURCE_TOO_LARGE');
    hash.update(bytes);
  }
  return hash.digest('hex');
}

async function mapAssets(scope) {
  const candidates = await listAssets(scope);
  const result = new Map();
  for (const row of candidates) {
    const key = await contentHash(row);
    const matches = result.get(key) ?? [];
    matches.push(row);
    result.set(key, matches);
  }
  return result;
}

async function signOut(scope) {
  await api('mutation {platformSignOut(everywhere:false)}', {}, scope);
}

function ownerPasswords() {
  let input;
  try {
    input = JSON.parse(
      process.env.FARMERLANE_FIXTURE_MEDIA_CREDENTIALS ?? 'null',
    );
  } catch {
    /* safe error below */
  }
  delete process.env.FARMERLANE_FIXTURE_MEDIA_CREDENTIALS;
  if (!input || typeof input !== 'object')
    throw new Error('MEDIA_CREDENTIALS_REQUIRED');
  return (account) => {
    const value = input.passwords?.[account] ?? input.sharedPassword;
    if (typeof value !== 'string' || !value || value.length > 1024)
      throw new Error('MEDIA_OWNER_PASSWORD_REQUIRED');
    return value;
  };
}

async function main() {
  const [start, anchor, approvalFlag, approved, runFlag, ...rest] =
    process.argv.slice(demo ? 3 : 2);
  const retry =
    rest[0] === '--retry-uncommitted' && rest.length === 2
      ? rest[1]
      : undefined;
  if (
    start !== '--anchor' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(anchor ?? '') ||
    approvalFlag !== '--approve' ||
    !/^[a-f0-9]{64}$/.test(approved ?? '') ||
    !['--check', '--upload'].includes(runFlag) ||
    (rest.length && (!retry || runFlag !== '--upload'))
  )
    throw new Error('MEDIA_USAGE');

  const password = runFlag === '--upload' ? ownerPasswords() : undefined;
  const plan = JSON.parse(
    execFileSync(
      process.execPath,
      [
        'dist/test-data-population.js',
        demo ? '--describe-demo' : '--describe',
        '--anchor',
        anchor,
      ],
      { cwd: backend, encoding: 'utf8', maxBuffer: 2_000_000 },
    ),
  );
  if (plan.digest !== approved || plan.assetPrefix !== assetPrefix)
    throw new Error('MEDIA_APPROVAL_MISMATCH');
  const prepared = new Map();
  for (const photo of plan.photos)
    prepared.set(photo.key, await approvedBytes(photo));
  for (const owner of plan.media) {
    if (
      new Set(owner.keys.map((key) => prepared.get(key).sha256)).size !==
      owner.keys.length
    )
      throw new Error('MEDIA_DUPLICATE_CONTENT');
  }
  if (
    retry &&
    !plan.media.some((owner) =>
      owner.keys.some((key) => retry === owner.id + '/' + key),
    )
  )
    throw new Error('MEDIA_RETRY_KEY_INVALID');
  if (runFlag === '--check') {
    console.log(
      JSON.stringify({
        status: 'media-validated',
        digest: approved,
        photos: prepared.size,
        uploads: plan.counts.uploads,
      }),
    );
    return;
  }

  const folder = path.join(
    root,
    '.runtime',
    demo ? 'local-trial-population' : 'staging-population',
  );
  fs.mkdirSync(folder, { recursive: true });
  const lockPath = path.join(folder, 'upload.lock');
  const lock = fs.openSync(lockPath, 'wx');
  try {
    const journalPath = path.join(folder, `${approved}.jsonl`);
    const events = fs.existsSync(journalPath)
      ? fs
          .readFileSync(journalPath, 'utf8')
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line))
      : [];
    const journal = fs.openSync(journalPath, 'a', 0o600);
    const append = (event) => {
      fs.writeSync(journal, JSON.stringify(event) + '\n');
      fs.fsyncSync(journal);
      events.push(event);
    };
    const media = {};
    try {
      for (const owner of plan.media) {
        const receipts = {};
        media[owner.id] = receipts;
        const recorded = owner.keys.map((key) =>
          events.findLast((event) => event.logical === owner.id + '/' + key),
        );
        if (recorded.every((event) => event?.id)) {
          for (const [index, key] of owner.keys.entries()) {
            const { id, source, sha256 } = recorded[index];
            if (
              !/^[1-9][0-9]{0,9}$/.test(id) ||
              sha256 !== prepared.get(key).sha256 ||
              (await contentHash({ source })) !== sha256
            ) {
              throw new Error(`MEDIA_RECEIPT_DRIFT:${owner.id}/${key}`);
            }
            receipts[key] = { id, source };
          }
          console.error(
            JSON.stringify({
              status: 'media-owner-verified',
              id: owner.id,
              assets: owner.keys.length,
              reusedReceipts: true,
            }),
          );
          continue;
        }
        const account = plan.accounts.find((item) => item.id === owner.id);
        const scope = await signIn(account, password(owner.id));
        try {
          const existing = await mapAssets(scope);
          for (const [index, key] of owner.keys.entries()) {
            const logical = owner.id + '/' + key;
            const { clean, sha256 } = prepared.get(key);
            const previous = recorded[index];
            const matches = existing.get(sha256) ?? [];
            if ((previous && previous.sha256 !== sha256) || matches.length > 1)
              throw new Error(`MEDIA_CONTENT_CONFLICT:${logical}`);
            if (matches.length === 1) {
              const [receipt] = matches;
              if (
                previous?.id &&
                (previous.id !== receipt.id ||
                  previous.source !== receipt.source)
              )
                throw new Error(`MEDIA_RECEIPT_DRIFT:${logical}`);
              if (!previous?.id) append({ logical, sha256, ...receipt });
              receipts[key] = receipt;
              continue;
            }
            if (previous?.id) throw new Error(`MEDIA_RECEIPT_DRIFT:${logical}`);
            if (
              previous &&
              (retry !== logical || Date.now() - previous.startedAt < 120_000)
            )
              throw new Error(`MEDIA_COMMIT_UNCERTAIN:${logical}`);
            append({ logical, sha256, startedAt: Date.now() });
            try {
              const { data } = await api(
                'mutation($file:Upload!){uploadOwnStorefrontImage(input:{},file:$file)}',
                { file: null },
                scope,
                { bytes: clean, filename: `${key}.jpg` },
              );
              const uploaded = data.uploadOwnStorefrontImage;
              const source = sourceFromPreview(uploaded?.preview);
              const id = String(uploaded?.id);
              if (
                !source ||
                !/^[1-9][0-9]{0,9}$/.test(id) ||
                (await contentHash({ source })) !== sha256
              )
                throw new Error('MEDIA_UPLOAD_RECEIPT_INVALID');
              const receipt = { id, source };
              append({ logical, sha256, ...receipt });
              receipts[key] = receipt;
            } catch {
              throw new Error(`MEDIA_COMMIT_UNCERTAIN:${logical}`);
            }
          }
          console.error(
            JSON.stringify({
              status: 'media-owner-verified',
              id: owner.id,
              assets: owner.keys.length,
            }),
          );
        } finally {
          await signOut(scope).catch(() => undefined);
        }
      }
      const handoff = gzipSync(
        JSON.stringify({ digest: approved, media }),
      ).toString('base64url');
      const entry = demo
        ? 'node node_modules/ts-node/dist/bin.js --project scripts/market-operations-demo/tsconfig.json scripts/test-data-population-demo.ts'
        : 'node dist/test-data-population.js';
      console.log(
        `${entry} --apply --anchor ${anchor} --approve ${approved} --media ${handoff}`,
      );
    } finally {
      fs.closeSync(journal);
    }
  } finally {
    fs.closeSync(lock);
    fs.unlinkSync(lockPath);
  }
}

if (require.main === module)
  main().catch((error) => {
    const safe = /^[A-Z_0-9]+(?::[a-z0-9/-]+)?$/.test(error.message)
      ? error.message
      : 'MEDIA_WORKSTATION_FAILED';
    console.error(JSON.stringify({ status: 'failed', code: safe }));
    process.exitCode = 1;
  });
module.exports = { sourceFromPreview };
