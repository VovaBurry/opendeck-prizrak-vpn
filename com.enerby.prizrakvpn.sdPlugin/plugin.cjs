'use strict';

// Плагин Prizrak-Box VPN для OpenDeck.
// Подключается к шине событий OpenDeck по WebSocket, обрабатывает keyDown
// и отправляет setState/setImage/setTitle для обновления кнопок.

const fs = require('node:fs');
const path = require('node:path');

const { PrizrakApi } = require('./lib/prizrak.cjs');
const icons = require('./lib/icons.cjs');
const serverName = require('./lib/serverName.cjs');

const args = process.argv.slice(2);
function argValue(flag) {
	const i = args.indexOf(flag);
	return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

const PORT = Number(argValue('-port') || 57116);
const PLUGIN_UUID = argValue('-pluginUUID') || 'com.enerby.prizrakvpn.sdPlugin';

// Какие контексты сейчас на экране (для периодического обновления).
const visible = new Map(); // context -> action
let refreshTimer = null;


const LOG_DIR = path.join(__dirname, 'logs');
function log() {
	const parts = Array.prototype.slice.call(arguments);
	const line = '[' + new Date().toISOString() + '] ' + parts.join(' ');
	try {
		fs.mkdirSync(LOG_DIR, { recursive: true });
		fs.appendFileSync(path.join(LOG_DIR, 'prizrakvpn.log'), line + '\n');
	} catch (e) {}
	console.log(line);
}

// Клиент создаём лениво: если конфиг Prizrak-Box не найден,
// плагин не должен падать при старте. Вместо этого на кнопках
// будет состояние "нет связи", а в лог попадёт причина.
let api = null;
let apiError = null;

try {
	api = new PrizrakApi();
	log("API: " + api.cfg.host + ":" + api.cfg.port + " (секрет найден)");
} catch (e) {
	apiError = e;
	log("ВНИМАНИЕ: " + e.message);
}

// Если Prizrak-Box запустили уже после OpenDeck, пробуем подключиться снова.
function ensureApi() {
	if (api) return api;
	try {
		api = new PrizrakApi();
		apiError = null;
		log("Подключение к API: " + api.cfg.host + ":" + api.cfg.port);
	} catch (e) {
		apiError = e;
	}
	return api;
}

// Явная проверка перед использованием: если клиента нет,
// бросаем понятную ошибку, а не "Cannot read properties of null".
function requireApi() {
	const client = ensureApi();
	if (!client) {
		throw new Error(
			apiError ? apiError.message : "Prizrak-Box не найден"
		);
	}
	return client;
}

// --- WebSocket ---

let ws = null;

function send(obj) {
	if (ws && ws.readyState === 1) {
		ws.send(JSON.stringify(obj));
	} else {
		log('WARN cannot send, ws not ready');
	}
}

function connect() {
	try {
		ws = new WebSocket('ws://127.0.0.1:' + PORT);
	} catch (err) {
		log('WS create error', err && err.message);
		scheduleReconnect();
		return;
	}

	ws.onopen = function () {
		log('WS connected');
		send({ event: 'registerPlugin', uuid: PLUGIN_UUID });
	};

	ws.onmessage = function (msg) {
		let data;
		try {
			data = JSON.parse(msg.data);
		} catch (e) {
			return;
		}
		handleEvent(data).catch(function (err) {
			log('handler error', err && err.stack);
		});
	};

	ws.onclose = function () {
		log('WS closed');
		scheduleReconnect();
	};

	ws.onerror = function (err) {
		if (err && err.message) log('WS error', err.message);
	};
}

let reconnectTimer = null;
function scheduleReconnect() {
	if (reconnectTimer) return;
	reconnectTimer = setTimeout(function () {
		reconnectTimer = null;
		connect();
	}, 2000);
}

// --- Диспетчер ---

async function handleEvent(evt) {
	const action = evt.action;
	const context = evt.context;

	if (evt.event === 'willAppear') {
		if (action) visible.set(context, action);
	}
	if (evt.event === 'willDisappear') {
		visible.delete(context);
	}

	if (evt.event === 'willAppear' || evt.event === 'didReceiveSettings') {
		if (action) await refreshAction(action, context);
		return;
	}
	if (evt.event === 'keyDown') {
		if (action) await onKeyDown(action, context);
		return;
	}
}
async function onKeyDown(action, context) {
	try {
		if (action === 'com.enerby.prizrakvpn.tun') {
			const cfg = await requireApi().configs();
			const enabled = !!(cfg && cfg.tun && cfg.tun.enable);
			await requireApi().setTun(!enabled, cfg && cfg.tun && cfg.tun.stack);
			await refreshAction(action, context);
			return;
		}

		if (action === 'com.enerby.prizrakvpn.mode') {
			const cfg = await requireApi().configs();
			const order = ['rule', 'global', 'direct'];
			const current = (cfg && cfg.mode) || 'rule';
			const next = order[(order.indexOf(current) + 1) % order.length];
			await requireApi().setMode(next);
			await refreshAction(action, context);
			return;
		}

		if (action === 'com.enerby.prizrakvpn.group') {
			const groups = await requireApi().selectorGroups();
			if (!groups.length) {
				showAlert(context);
				return;
			}
			const target = groups.find(function (g) { return g.name !== 'GLOBAL'; }) || groups[0];
			const all = (target.all || []).filter(function (n) { return n !== 'DIRECT'; });
			if (all.length < 2) {
				showAlert(context);
				return;
			}
			const idx = all.indexOf(target.now);
			const next = all[(idx + 1) % all.length];
			await requireApi().selectProxy(target.name, next);
			await refreshAction(action, context);
			return;
		}

		if (action === 'com.enerby.prizrakvpn.traffic') {
			await refreshAction(action, context);
			return;
		}
	} catch (err) {
		log('keyDown error', action, err && err.message);
		showAlert(context);
	}
}
// mihomo отдаёт только суммарные счётчики (downloadTotal/uploadTotal).
// Скорость считаем по дельте, но с двумя предосторожностями:
//  1) не чаще, чем раз в MIN_INTERVAL_MS — иначе при нажатии на кнопку
//     повторная выборка приходит через десятки мс, трафик при этом
//     приходит пачками, и мгновенная скорость оказывается завышенной;
//  2) по скользящему окну в несколько секунд, чтобы сгладить рывки.

const MIN_INTERVAL_MS = 900;
const WINDOW_MS = 2000;

const trafficHistory = [];
let lastSampleAt = 0;
let lastResult = { down: 0, up: 0 };

async function sampleSpeed() {
	const now = Date.now();

	// Недавно опрашивали — отдаём прошлый результат, не дёргая API.
	// Это же защищает от скачков при нажатии на кнопку.
	if (now - lastSampleAt < MIN_INTERVAL_MS) return lastResult;

	const conn = await requireApi().connections();
	if (!conn) return lastResult;

	// Время фиксируем ПОСЛЕ ответа, иначе в него попадает сетевой запрос
	const stamp = Date.now();
	lastSampleAt = stamp;

	const snap = {
		down: conn.downloadTotal || 0,
		up: conn.uploadTotal || 0,
		at: stamp,
	};

	trafficHistory.push(snap);
	while (trafficHistory.length > 2 && stamp - trafficHistory[0].at > WINDOW_MS) {
		trafficHistory.shift();
	}

	const first = trafficHistory[0];
	const dt = (stamp - first.at) / 1000;

	if (dt > 1.0) {
		lastResult = {
			down: Math.max(0, (snap.down - first.down) / dt),
			up: Math.max(0, (snap.up - first.up) / dt),
		};
	}

	return lastResult;
}

async function refreshAction(action, context) {
	try {
		if (action === 'com.enerby.prizrakvpn.tun') {
			const cfg = await requireApi().configs();
			const enabled = !!(cfg && cfg.tun && cfg.tun.enable);
			setImage(context, icons.drawPower(enabled));
			return;
		}

		if (action === 'com.enerby.prizrakvpn.mode') {
			const cfg = await requireApi().configs();
			const mode = (cfg && cfg.mode) || 'rule';
			setImage(context, icons.drawModeLabel(mode));
			return;
		}

		if (action === 'com.enerby.prizrakvpn.group') {
			const groups = await requireApi().selectorGroups();
			const target = groups.find(function (g) { return g.name !== 'GLOBAL'; }) || groups[0];
			if (!target) {
				setImage(context, icons.drawOffline());
				return;
			}

			// Имя сервера приходит из приложения, поэтому кнопка
			// всегда показывает актуальный сервер, даже если список изменился.
			const info = serverName.describeServer(target.now || '');
			setImage(context, icons.drawServer(info.badge, info.label));
			return;
		}

		if (action === 'com.enerby.prizrakvpn.traffic') {
			const speed = await sampleSpeed();
			const down = icons.humanRate(speed.down);
			const up = icons.humanRate(speed.up);
			setImage(context, icons.drawSpeed(down, up));
			return;
		}
	} catch (err) {
		log('refresh error', action, err && err.message);
		setImage(context, icons.drawOffline());
	}
}

function setImage(context, dataUrl) {
	send({ event: 'setImage', context: context, payload: { image: dataUrl } });
}

function showAlert(context) {
	send({ event: 'showAlert', context: context });
}

function startRefreshLoop() {
	if (refreshTimer) return;
	refreshTimer = setInterval(() => {
		for (const [context, action] of visible) {
			refreshAction(action, context).catch(() => {});
		}
	}, 3000);
}

log('Prizrak VPN plugin starting, uuid=' + PLUGIN_UUID + ' port=' + PORT);
connect();
startRefreshLoop();
