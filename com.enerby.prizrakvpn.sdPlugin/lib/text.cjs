'use strict';

// Растровый шрифт: глифы отрендерены системным шрифтом Consolas Bold с
// антиалиасингом и зашиты в glyphs.json (значения 0..15 - покрытие пикселя).
// Даёт настоящий сглаженный текст вместо пиксельных кубиков.

const GLYPHS = require('./glyphs.json');

const FALLBACK = '?';
const SPACE = ' ';
const COVERAGE = 17; // множитель обратно к 0..255

function glyphFor(ch) {
	return GLYPHS[ch] || GLYPHS[FALLBACK] || GLYPHS[SPACE] || null;
}

// Ширина строки в пикселях при заданном масштабе.
function textWidth(text, scale, tracking) {
	const tr = tracking === undefined ? 0 : tracking;
	let total = 0;
	const chars = String(text).toUpperCase().split('');
	for (let i = 0; i < chars.length; i++) {
		const g = glyphFor(chars[i]);
		const adv = g ? g.a : 7;
		total += Math.round(adv * scale) + tr;
	}
	return Math.max(0, total - tr);
}

function glyphHeight(text, scale) {
	let above = 0;
	let below = 0;
	for (const ch of String(text).toUpperCase()) {
		const g = glyphFor(ch);
		if (!g) continue;
		const top = g.t * scale;
		if (top < above) above = top;
		const bottom = (g.t + g.p.length) * scale;
		if (bottom > below) below = bottom;
	}
	return { above: -above, below };
}

// Рисует текст с выравниванием по базовой линии.
// opts: { x, baseline, scale, color, align: 'left'|'center'|'right', boxWidth }
function drawTextBaseline(canvas, text, opts) {
	const scale = opts.scale === undefined ? 1 : opts.scale;
	const color = opts.color || [240, 242, 248];
	const tracking = opts.tracking === undefined ? 0 : opts.tracking;
	const chars = String(text).toUpperCase().split('');

	const width = textWidth(text, scale, tracking);
	let cursor = opts.x;
	if (opts.align === 'center') cursor = opts.x + (opts.boxWidth - width) / 2;
	else if (opts.align === 'right') cursor = opts.x + (opts.boxWidth - width);

	for (const ch of chars) {
		const g = glyphFor(ch);
		if (!g) continue;
		const adv = Math.round(g.a * scale);
		const rows = g.p;

		for (let row = 0; row < rows.length; row++) {
			const srcRow = rows[row];
			const py0 = opts.baseline + Math.round(g.t * scale) + row * scale;
			for (let col = 0; col < srcRow.length; col++) {
				const cov = srcRow[col];
				if (cov <= 0) continue;
				const px0 = Math.round(cursor + col * scale);
				const alpha = Math.min(1, cov / 15);
				for (let dy = 0; dy < scale; dy++) {
					for (let dx = 0; dx < scale; dx++) {
						blend(canvas, px0 + dx, py0 + dy, color, alpha);
					}
				}
			}
		}
		cursor += adv + tracking;
	}
}

function blend(canvas, x, y, color, alpha) {
	if (alpha <= 0) return;
	if (x < 0 || y < 0 || x >= canvas.w || y >= canvas.h) return;
	const i = (y * canvas.w + x) * 3;
	if (alpha >= 1) {
		canvas.data[i] = color[0];
		canvas.data[i + 1] = color[1];
		canvas.data[i + 2] = color[2];
		return;
	}
	for (let k = 0; k < 3; k++) {
		canvas.data[i + k] = Math.round(canvas.data[i + k] * (1 - alpha) + color[k] * alpha);
	}
}

// Подбор масштаба под заданную ширину (для длинных подписей).
function fitScale(text, maxWidth, preferred) {
	let scale = preferred === undefined ? 2 : preferred;
	while (scale > 1 && textWidth(text, scale, 0) > maxWidth) scale--;
	return scale;
}

// Удобная обёртка: рисует текст по центру прямоугольника (x,y,w,h),
// автоматически подбирая вертикальное положение относительно базовой линии.
function drawText(canvas, text, opts) {
	const maxScale = opts.scale === undefined ? 2 : opts.scale;
	// noShrink: держим масштаб постоянным, чтобы цифры не «прыгали»
	const scale = opts.noShrink ? maxScale : fitScale(text, opts.w, maxScale);
	const metrics = glyphHeight(text, scale);
	const textHeight = metrics.above + metrics.below;
	const topY = opts.y + (opts.h - textHeight) / 2;
	const baseline = topY + metrics.above;
	drawTextBaseline(canvas, text, {
		x: opts.x,
		baseline: Math.round(baseline),
		scale,
		color: opts.color,
		align: 'center',
		boxWidth: opts.w,
		tracking: opts.tracking === undefined ? 0 : opts.tracking,
	});
	return scale;
}

module.exports = { drawText, drawTextBaseline, textWidth, glyphHeight, fitScale };
