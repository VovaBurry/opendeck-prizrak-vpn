'use strict';

// Разбор имён серверов из mihomo: вытаскиваем код страны и «кодовое имя».
// Имена приходят вида: "🇫🇮 Reality-ME|⏳947D", "🇷🇺 Без VPN", "DIRECT".

// Региональные индикаторы флага: 🇦 (U+1F1E6) .. 🇿 (U+1F1FF)
const FLAG_BASE = 0x1f1e6;

function flagFromEmoji(str) {
	const chars = Array.from(str);
	if (chars.length < 2) return null;
	const a = chars[0].codePointAt(0);
	const b = chars[1].codePointAt(0);
	if (a >= FLAG_BASE && a <= FLAG_BASE + 25 && b >= FLAG_BASE && b <= FLAG_BASE + 25) {
		return String.fromCharCode(65 + (a - FLAG_BASE)) + String.fromCharCode(65 + (b - FLAG_BASE));
	}
	return null;
}

// Специальные метки, для которых флага нет
function specialBadge(str) {
	if (str.includes('🎲')) return 'AUTO';
	if (str.includes('🚫')) return 'BLOCK';
	if (str.includes('🌍')) return 'WORLD';
	if (str.includes('📡')) return 'ANY';
	return null;
}

// Убираем эмодзи и служебные хвосты вроде "|⏳947D".
function cleanName(raw) {
	let s = String(raw);

	// флаг в начале
	const flag = flagFromEmoji(s);
	if (flag) s = s.slice(2);

	s = s
		// убираем всё после вертикальной черты (серийники, таймеры)
		.replace(/\|.*$/, '')
		// убираем эмодзи и пиктограммы
		.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{20E3}]/gu, '')
		.trim();

	// латиница и цифры — для отображения годится только это
	return s;
}

// Короткое имя для кнопки: максимум 6-7 символов, латиница/цифры.
function shortLabel(raw, maxLen) {
	const limit = maxLen === undefined ? 7 : maxLen;
	const clean = cleanName(raw);
	const upper = clean.toUpperCase();

	// Semantically known entries first
	if (upper.includes('БЕЗ VPN') || upper.includes('RU САЙТ')) return 'RU';
	if (upper.includes('НЕДОСТУП')) return 'BLOCK';
	if (upper.includes('ЛЮБОЙ')) return 'AUTO';
	if (upper.includes('ОСТАЛЬНЫЕ')) return 'WORLD';
	if (upper.includes('APPVPN')) return 'APP';
	if (upper === 'DIRECT') return 'DIRECT';
	if (upper === 'REJECT') return 'REJECT';

	// Latin names: keep the meaningful head, e.g. Reality-ME -> REALITY
	const latin = clean.match(/[A-Za-z][A-Za-z0-9\-_.]*/);
	if (latin) {
		const word = latin[0].toUpperCase().replace(/[_.]+/g, '-');
		const head = word.split('-')[0].replace(/-+$/, '');
		if (head.length >= 2) return head.length > limit ? head.slice(0, limit) : head;
		if (word.length >= 2) return word.length > limit ? word.slice(0, limit) : word;
	}

	// Cyrillic fallback
	const tl = transliterate(upper);
	const words = tl.split(/[\s\-_]+/).filter(Boolean);
	if (words.length >= 2) {
		const abbr = words.map((w) => w[0]).join('');
		if (abbr.length >= 2) return abbr.slice(0, limit);
	}
	const single = words[0] || '';
	return single.slice(0, limit) || '---';
}

const TRANSLIT_MAP = {
	А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'E', Ж: 'ZH', З: 'Z', И: 'I',
	Й: 'I', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T',
	У: 'U', Ф: 'F', Х: 'H', Ц: 'C', Ч: 'CH', Ш: 'SH', Щ: 'SH', Ъ: '', Ы: 'Y', Ь: '',
	Э: 'E', Ю: 'YU', Я: 'YA',
};

function transliterate(str) {
	let out = '';
	for (const ch of str) out += TRANSLIT_MAP[ch] !== undefined ? TRANSLIT_MAP[ch] : ch;
	return out.replace(/[^A-Z0-9\-_ ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Главная функция: из сырого имени делает { badge, label }.
function describeServer(raw) {
	const clean = cleanName(raw);
	const flag = flagFromEmoji(raw);
	const badge = flag || specialBadge(raw) || 'NET';
	return { badge, label: shortLabel(raw, 7), raw: clean };
}

module.exports = { describeServer, cleanName, shortLabel, flagFromEmoji, transliterate };
