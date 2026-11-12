'use strict';

// Клиент REST API mihomo — ядра Prizrak-Box.
// Ядро слушает только loopback и требует secret в заголовке Authorization.
//
// Порт и секрет НЕ хардкодятся: у каждого пользователя они свои.
// Они лежат в Local Storage приложения (leveldb) и читаются при старте.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 9686;

// Возможные имена каталогов данных приложения (на случай переименования).
const APP_DIR_NAMES = ['Prizrak-Box', 'PrizrakBox', 'prizrak-box'];

function appDataDir() {
	if (process.platform === 'win32') {
		return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
	}
	if (process.platform === 'darwin') {
		return path.join(os.homedir(), 'Library', 'Application Support');
	}
	return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
}

// Prizrak-Box (Electron) хранит {host, port, secret} в Local Storage.
// Файлы leveldb содержат бинарные префиксы, но JSON-фрагмент читается
// как обычный текст, поэтому достаточно регулярки.
function readFromLevelDb(dir) {
	let entries;
	try {
		entries = fs.readdirSync(dir);
	} catch {
		return null;
	}

	const files = entries
		.filter((f) => f.endsWith('.ldb') || f.endsWith('.log'))
		.map((f) => path.join(dir, f));

	let best = null;
	for (const file of files) {
		let text;
		try {
			text = fs.readFileSync(file).toString('utf8');
		} catch {
			continue;
		}

		// {"host":"127.0.0.1","port":"9686","secret":"..."}
		const re = /\{"host":"([^"]+)","port":"?(\d+)"?,"secret":"([^"]+)"/g;
		let m;
		while ((m = re.exec(text)) !== null) {
			best = { host: m[1], port: Number(m[2]), secret: m[3] };
		}
	}
	return best;
}

// Ищем конфиг во всех известных местах. Возвращает null, если не нашли.
function discoverConfig() {
	const base = appDataDir();

	for (const name of APP_DIR_NAMES) {
		for (const sub of ['Local Storage/leveldb', 'Local Storage', 'leveldb']) {
			const dir = path.join(base, name, ...sub.split('/'));
			const found = readFromLevelDb(dir);
			if (found && found.secret) {
				return {
					host: found.host || DEFAULT_HOST,
					port: found.port || DEFAULT_PORT,
					secret: found.secret,
					source: 'localstorage',
				};
			}
		}
	}

	return null;
}

class PrizrakApi {
	constructor(cfg) {
		this.cfg = cfg || discoverConfig();
		if (!this.cfg) {
			throw new Error(
				'Не найден конфиг Prizrak-Box. Убедитесь, что приложение запущено хотя бы раз.',
			);
		}
	}

	request(method, endpoint, body, timeoutMs = 4000) {
		const { host, port, secret } = this.cfg;
		const payload = body === undefined ? null : Buffer.from(JSON.stringify(body), 'utf8');

		const headers = { Authorization: `Bearer ${secret}` };
		if (payload) {
			headers['Content-Type'] = 'application/json';
			headers['Content-Length'] = payload.length;
		}

		return new Promise((resolve, reject) => {
			const req = http.request(
				{ host, port, path: endpoint, method, headers, timeout: timeoutMs },
				(res) => {
					const chunks = [];
					res.on('data', (c) => chunks.push(c));
					res.on('end', () => {
						const text = Buffer.concat(chunks).toString('utf8');
						if (res.statusCode >= 200 && res.statusCode < 300) {
							if (!text) return resolve(null);
							try {
								resolve(JSON.parse(text));
							} catch {
								resolve(text);
							}
						} else if (res.statusCode === 401) {
							reject(new Error('unauthorized: неверный secret API'));
						} else {
							reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 120)}`));
						}
					});
				},
			);
			req.on('timeout', () => req.destroy(new Error('timeout')));
			req.on('error', reject);
			if (payload) req.write(payload);
			req.end();
		});
	}

	version() {
		return this.request('GET', '/version');
	}

	// Полный конфиг ядра: tun.enable, mode, mixed-port и т.д.
	configs() {
		return this.request('GET', '/configs');
	}

	// Частичное обновление. Меняются только переданные поля.
	patchConfigs(partial) {
		return this.request('PATCH', '/configs', partial);
	}

	proxies() {
		return this.request('GET', '/proxies');
	}

	selectProxy(group, name) {
		return this.request('PUT', `/proxies/${encodeURIComponent(group)}`, { name });
	}

	connections() {
		return this.request('GET', '/connections');
	}

	async setTun(enabled, stack) {
		const tun = { enable: !!enabled };
		if (stack) tun.stack = stack;
		return this.patchConfigs({ tun });
	}

	async setMode(mode) {
		return this.patchConfigs({ mode });
	}

	// mihomo отдаёт /proxies как {proxies: {GROUP: {...}}}; нужны только селекторы.
	async selectorGroups() {
		const data = await this.proxies();
		const map = (data && data.proxies) || {};
		const out = [];
		for (const [name, value] of Object.entries(map)) {
			if (!value || value.type !== 'Selector') continue;
			out.push({ name, now: value.now, all: Array.isArray(value.all) ? value.all : [] });
		}
		return out;
	}
}

module.exports = { PrizrakApi, discoverConfig, DEFAULT_HOST, DEFAULT_PORT };
