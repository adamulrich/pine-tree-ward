/**
 * Bulletin Archiver
 *
 * Watches Gmail for weekly bulletin emails, commits the Digital and Printout
 * PDFs to GitHub, updates bulletins/manifest.json, and labels a thread only
 * after the complete archive operation succeeds.
 *
 * Script Property required:
 *   GITHUB_TOKEN = fine-grained token with Contents: Read and write access
 */

const CONFIG = {
  SENDER_EMAIL: 'adam.ulrich@live.com',
  GITHUB_OWNER: 'adamulrich',
  GITHUB_REPO: 'pine-tree-ward',
  GITHUB_BRANCH: 'main',
  REPO_FOLDER: 'bulletins',
  MANIFEST_PATH: 'bulletins/manifest.json',
  GMAIL_LABEL: 'Bulletin-Archived',
  MAX_THREADS_PER_RUN: 20,
};

function processInbox() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    Logger.log('Another bulletin archive run is already active.');
    return;
  }

  try {
    getGitHubToken_();
    const label = ensureLabelExists_(CONFIG.GMAIL_LABEL);
    const query = `from:${CONFIG.SENDER_EMAIL} has:attachment -label:${CONFIG.GMAIL_LABEL}`;
    const threads = GmailApp.search(query, 0, CONFIG.MAX_THREADS_PER_RUN);

    if (threads.length === 0) {
      Logger.log('No new bulletin emails.');
      return;
    }

    const manifestAdditions = [];
    const completedThreads = [];
    const handledThisRun = new Set();

    threads.forEach((thread) => {
      try {
        let processedMessage = false;

        thread.getMessages().forEach((message) => {
          const bulletins = validateBulletinAttachments_(message);
          if (!bulletins) return;

          bulletins.forEach(({ attachment, filename, date }) => {
            if (handledThisRun.has(filename)) return;

            const path = `${CONFIG.REPO_FOLDER}/${filename}`;
            commitFileToGitHub_(path, attachment.getBytes(), `Add ${filename}`);
            handledThisRun.add(filename);
            manifestAdditions.push({ filename, date, path });
            Logger.log(`Archived ${filename}`);
          });

          processedMessage = true;
        });

        if (processedMessage) completedThreads.push(thread);
        else Logger.log(`Thread ${thread.getId()} did not contain a valid bulletin pair.`);
      } catch (error) {
        Logger.log(`Thread ${thread.getId()} failed: ${error.message}`);
      }
    });

    if (manifestAdditions.length === 0) {
      Logger.log('No complete bulletin pairs were archived.');
      return;
    }

    updateManifest_(manifestAdditions);
    completedThreads.forEach((thread) => thread.addLabel(label));
    Logger.log(`Archived ${manifestAdditions.length} PDFs from ${completedThreads.length} thread(s).`);
  } finally {
    lock.releaseLock();
  }
}

function validateBulletinAttachments_(message) {
  const pdfs = message.getAttachments({
    includeInlineImages: false,
    includeAttachments: true,
  }).filter((attachment) => attachment.getName().toLowerCase().endsWith('.pdf'));

  if (pdfs.length !== 2) return null;

  const parsed = pdfs.map((attachment) => {
    const filename = attachment.getName();
    const match = filename.match(/^(Digital|Printout) (\d{8})\.pdf$/);
    return match ? { attachment, filename, type: match[1], date: match[2] } : null;
  });

  if (parsed.some((item) => !item)) return null;
  if (parsed[0].date !== parsed[1].date) return null;
  if (new Set(parsed.map((item) => item.type)).size !== 2) return null;
  if (!isValidBulletinDate_(parsed[0].date)) return null;

  return parsed;
}

function commitFileToGitHub_(path, bytes, message) {
  const url = githubContentsUrl_(path);
  const existing = githubFetch_(url, { method: 'get' });

  if (existing.code === 200) {
    Logger.log(`${path} already exists; keeping the existing file.`);
    return;
  }
  if (existing.code !== 404) throw githubError_('Check existing file', existing);

  const response = githubFetch_(url, {
    method: 'put',
    contentType: 'application/json',
    payload: JSON.stringify({
      message,
      content: Utilities.base64Encode(bytes),
      branch: CONFIG.GITHUB_BRANCH,
    }),
  });

  if (response.code !== 200 && response.code !== 201) {
    throw githubError_(`Commit ${path}`, response);
  }
}

function updateManifest_(newEntries) {
  const url = githubContentsUrl_(CONFIG.MANIFEST_PATH);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const existing = githubFetch_(url, { method: 'get' });
    let manifest = [];
    let sha = null;

    if (existing.code === 200) {
      const data = JSON.parse(existing.body);
      sha = data.sha;
      const decoded = Utilities.base64Decode(String(data.content || '').replace(/\s/g, ''));
      manifest = JSON.parse(Utilities.newBlob(decoded).getDataAsString());
      if (!Array.isArray(manifest)) throw new Error('Existing bulletin manifest is not an array.');
    } else if (existing.code !== 404) {
      throw githubError_('Read bulletin manifest', existing);
    }

    const entriesByPath = new Map();
    manifest.concat(newEntries).forEach((entry) => {
      if (entry && entry.path) entriesByPath.set(entry.path, entry);
    });

    const updated = Array.from(entriesByPath.values()).sort((a, b) => {
      const dateOrder = String(b.date || '').localeCompare(String(a.date || ''));
      return dateOrder || String(a.filename || '').localeCompare(String(b.filename || ''));
    });

    const payload = {
      message: 'Update bulletin manifest',
      content: Utilities.base64Encode(JSON.stringify(updated, null, 2)),
      branch: CONFIG.GITHUB_BRANCH,
    };
    if (sha) payload.sha = sha;

    const response = githubFetch_(url, {
      method: 'put',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
    });

    if (response.code === 200 || response.code === 201) return;
    if (response.code === 409 && attempt < 3) {
      Utilities.sleep(attempt * 750);
      continue;
    }
    throw githubError_('Update bulletin manifest', response);
  }
}

function githubFetch_(url, options) {
  const method = String(options.method || 'get').toLowerCase();
  const requestUrl = method === 'get'
    ? `${url}?ref=${encodeURIComponent(CONFIG.GITHUB_BRANCH)}`
    : url;
  const response = UrlFetchApp.fetch(requestUrl, {
    ...options,
    headers: {
      Authorization: `Bearer ${getGitHubToken_()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    muteHttpExceptions: true,
  });

  return {
    code: response.getResponseCode(),
    body: response.getContentText(),
  };
}

function isValidBulletinDate_(value) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
}

function githubContentsUrl_(path) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${encodedPath}`;
}

function githubError_(action, response) {
  let detail = response.body;
  try {
    detail = JSON.parse(response.body).message || response.body;
  } catch (_ignored) {
    // Use the response text when GitHub did not return JSON.
  }
  return new Error(`${action} failed (${response.code}): ${detail}`);
}

function getGitHubToken_() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Missing GITHUB_TOKEN Script Property.');
  return token;
}

function ensureLabelExists_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}
