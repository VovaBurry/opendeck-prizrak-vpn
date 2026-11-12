'use strict';

// РЈСЃС‚СЂРѕР№СЃС‚РІРѕ (Mirabox HSV293S) РїСЂРёРЅРёРјР°РµС‚ РўРћР›Р¬РљРћ JPEG.
// РџР»Р°РіРёРЅ РїРѕРґРґРµСЂР¶РєРё СѓСЃС‚СЂРѕР№СЃС‚РІР° РѕС‚РєР»РѕРЅСЏРµС‚ Р»СЋР±РѕР№ РґСЂСѓРіРѕР№ mime-С‚РёРї, РїРѕСЌС‚РѕРјСѓ РєР°СЂС‚РёРЅРєСѓ
// РґР»СЏ РєРЅРѕРїРєРё РЅСѓР¶РЅРѕ РѕС‚РґР°РІР°С‚СЊ РєР°Рє data:image/jpeg;base64.
//
// Р—РґРµСЃСЊ СЂРёСЃСѓРµРј РїСЂРѕСЃС‚С‹Рµ РёРєРѕРЅРєРё РїСЂСЏРјРѕ РІ РїРёРєСЃРµР»СЏС… Рё РєРѕРґРёСЂСѓРµРј РІ JPEG Р±РµР· РІРЅРµС€РЅРёС… Р·Р°РІРёСЃРёРјРѕСЃС‚РµР№.

const { drawText } = require('./text.cjs');

const KEY_W = 95;
const KEY_H = 95;

const ZIGZAG = [
	0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50,
	43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
];

const STD_DC_LUMINANCE_NRCODES = [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
const STD_DC_LUMINANCE_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const STD_AC_LUMINANCE_NRCODES = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d];
const STD_AC_LUMINANCE_VALUES = [
	0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
	0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
	0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
	0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
	0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
	0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
	0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
];

const STD_DC_CHROMINANCE_NRCODES = [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
const STD_DC_CHROMINANCE_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const STD_AC_CHROMINANCE_NRCODES = [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77];
const STD_AC_CHROMINANCE_VALUES = [
	0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71, 0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91,
	0xa1, 0xb1, 0xc1, 0x09, 0x23, 0x33, 0x52, 0xf0, 0x15, 0x62, 0x72, 0xd1, 0x0a, 0x16, 0x24, 0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26,
	0x27, 0x28, 0x29, 0x2a, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58,
	0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87,
	0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4,
	0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda,
	0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
];

function buildHuffmanTable(nrcodes, values) {
	const table = new Map();
	let code = 0;
	let pos = 0;
	for (let bits = 1; bits <= 16; bits++) {
		for (let i = 0; i < nrcodes[bits - 1]; i++) {
			table.set(values[pos++], { code, length: bits });
			code++;
		}
		code <<= 1;
	}
	return table;
}

const HUFF = {
	dcLum: buildHuffmanTable(STD_DC_LUMINANCE_NRCODES, STD_DC_LUMINANCE_VALUES),
	acLum: buildHuffmanTable(STD_AC_LUMINANCE_NRCODES, STD_AC_LUMINANCE_VALUES),
	dcChr: buildHuffmanTable(STD_DC_CHROMINANCE_NRCODES, STD_DC_CHROMINANCE_VALUES),
	acChr: buildHuffmanTable(STD_AC_CHROMINANCE_NRCODES, STD_AC_CHROMINANCE_VALUES),
};

class BitWriter {
	constructor() {
		this.buffer = [];
		this.current = 0;
		this.count = 0;
	}

	writeBits(value, length) {
		for (let i = length - 1; i >= 0; i--) {
			this.current = (this.current << 1) | ((value >> i) & 1);
			this.count++;
			if (this.count === 8) {
				this.buffer.push(this.current);
				if (this.current === 0xff) this.buffer.push(0x00);
				this.current = 0;
				this.count = 0;
			}
		}
	}

	writeHuff(value, table) {
		const entry = table.get(value);
		if (!entry) throw new Error(`no huffman code for ${value}`);
		this.writeBits(entry.code, entry.length);
	}

	flush() {
		if (this.count > 0) {
			this.current = (this.current << (8 - this.count)) | ((1 << (8 - this.count)) - 1);
			this.buffer.push(this.current);
			if (this.current === 0xff) this.buffer.push(0x00);
			this.current = 0;
			this.count = 0;
		}
		return Buffer.from(this.buffer);
	}
}

function categoryOf(value) {
	let abs = Math.abs(value);
	let size = 0;
	while (abs) {
		abs >>= 1;
		size++;
	}
	return size;
}

// РџСЂСЏРјРѕРµ 2D-DCT (II) РґР»СЏ 8x8 Р±Р»РѕРєР° Рё РєРІР°РЅС‚РѕРІР°РЅРёРµ.
const COS = [];
for (let u = 0; u < 8; u++) {
	COS[u] = [];
	for (let x = 0; x < 8; x++) COS[u][x] = Math.cos(((2 * x + 1) * u * Math.PI) / 16);
}

const C = [1 / Math.SQRT2, 1, 1, 1, 1, 1, 1, 1];

function fdctQuantize(pixels, quant) {
	const out = new Array(64);
	for (let v = 0; v < 8; v++) {
		for (let u = 0; u < 8; u++) {
			let sum = 0;
			for (let y = 0; y < 8; y++) {
				for (let x = 0; x < 8; x++) sum += pixels[y * 8 + x] * COS[u][x] * COS[v][y];
			}
			out[v * 8 + u] = Math.round((0.25 * C[u] * C[v] * sum) / quant[v * 8 + u]);
		}
	}
	return out;
}

function huffEncodeBlock(writer, coeffs, prevDC, dcTable, acTable) {
	const diff = coeffs[0] - prevDC;
	const dcSize = categoryOf(diff);
	writer.writeHuff(dcSize, dcTable);
	if (dcSize > 0) writer.writeBits(diff < 0 ? diff + (1 << dcSize) - 1 : diff, dcSize);

	let zeros = 0;
	for (let i = 1; i < 64; i++) {
		// Клиппинг: таблица Хаффмана содержит категории только 0..10,
		// то есть |значение| <= 1023. Без этого при резких краях
		// пишется несуществующий код и JPEG получается битым.
		let value = coeffs[ZIGZAG[i]];
		if (value > 1023) value = 1023;
		else if (value < -1023) value = -1023;
		if (value === 0) {
			zeros++;
			continue;
		}
		while (zeros > 15) {
			writer.writeHuff(0xf0, acTable);
			zeros -= 16;
		}
		const size = categoryOf(value);
		writer.writeHuff((zeros << 4) | size, acTable);
		writer.writeBits(value < 0 ? value + (1 << size) - 1 : value, size);
		zeros = 0;
	}
	if (zeros > 0) writer.writeHuff(0x00, acTable);

	return coeffs[0];
}

// РЎС‚Р°РЅРґР°СЂС‚РЅС‹Рµ С‚Р°Р±Р»РёС†С‹ РєРІР°РЅС‚РѕРІР°РЅРёСЏ JPEG.
const BASE_QUANT = [
	16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68,
	109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
];

// scale: РјРµРЅСЊС€Рµ = Р»СѓС‡С€Рµ РєР°С‡РµСЃС‚РІРѕ (50 в‰€ СЃС‚Р°РЅРґР°СЂС‚РЅРѕРµ РєР°С‡РµСЃС‚РІРѕ 75).
function scaledQuant(scale) {
	return BASE_QUANT.map((v) => Math.min(255, Math.max(1, Math.round((v * scale) / 50))));
}

function encodeJpeg(width, height, rgb) {
	const qLum = scaledQuant(6);
	const qChr = scaledQuant(6);

	const out = [];
	const push = (...bytes) => out.push(...bytes);

	push(0xff, 0xd8);

	// DQT хранится в zigzag-порядке
	const zigzagOrder = (table) => {
		const r = new Array(64);
		for (let i = 0; i < 64; i++) r[i] = table[ZIGZAG[i]];
		return r;
	};

	push(0xff, 0xdb, 0x00, 0x43, 0x00);
	for (const v of zigzagOrder(qLum)) push(v);
	push(0xff, 0xdb, 0x00, 0x43, 0x01);
	for (const v of zigzagOrder(qChr)) push(v);

	push(0xff, 0xc0, 0x00, 0x11, 0x08);
	push((height >> 8) & 0xff, height & 0xff);
	push((width >> 8) & 0xff, width & 0xff);
	push(0x03);
	push(0x01, 0x11, 0x00); // 4:4:4
	push(0x02, 0x11, 0x01);
	push(0x03, 0x11, 0x01);

	push(0xff, 0xc4, 0x00, 0x1f, 0x00);
	for (const v of STD_DC_LUMINANCE_NRCODES) push(v);
	for (const v of STD_DC_LUMINANCE_VALUES) push(v);
	push(0xff, 0xc4, 0x00, 0xb5, 0x10);
	for (const v of STD_AC_LUMINANCE_NRCODES) push(v);
	for (const v of STD_AC_LUMINANCE_VALUES) push(v);
	push(0xff, 0xc4, 0x00, 0x1f, 0x01);
	for (const v of STD_DC_CHROMINANCE_NRCODES) push(v);
	for (const v of STD_DC_CHROMINANCE_VALUES) push(v);
	push(0xff, 0xc4, 0x00, 0xb5, 0x11);
	for (const v of STD_AC_CHROMINANCE_NRCODES) push(v);
	for (const v of STD_AC_CHROMINANCE_VALUES) push(v);

	push(0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00);

	const writer = new BitWriter();

	const Y = new Float64Array(width * height);
	const Cb = new Float64Array(width * height);
	const Cr = new Float64Array(width * height);
	for (let i = 0; i < width * height; i++) {
		const r = rgb[i * 3];
		const g = rgb[i * 3 + 1];
		const b = rgb[i * 3 + 2];
		Y[i] = 0.299 * r + 0.587 * g + 0.114 * b - 128;
		Cb[i] = -0.168736 * r - 0.331264 * g + 0.5 * b;
		Cr[i] = 0.5 * r - 0.418688 * g - 0.081312 * b;
	}

	const sampleBlock = (src, x0, y0, step) => {
		const block = new Array(64);
		for (let y = 0; y < 8; y++) {
			const sy = Math.min(y0 + y * step, height - 1);
			for (let x = 0; x < 8; x++) {
				const sx = Math.min(x0 + x * step, width - 1);
				block[y * 8 + x] = src[sy * width + sx];
			}
		}
		return block;
	};

	let prevY = 0;
	let prevCb = 0;
	let prevCr = 0;

	// 4:4:4: одному блоку Y соответствует один блок Cb и один блок Cr (MCU 8x8).
	for (let my = 0; my < height; my += 8) {
		for (let mx = 0; mx < width; mx += 8) {
			prevY = huffEncodeBlock(writer, fdctQuantize(sampleBlock(Y, mx, my, 1), qLum), prevY, HUFF.dcLum, HUFF.acLum);
			prevCb = huffEncodeBlock(writer, fdctQuantize(sampleBlock(Cb, mx, my, 1), qChr), prevCb, HUFF.dcChr, HUFF.acChr);
			prevCr = huffEncodeBlock(writer, fdctQuantize(sampleBlock(Cr, mx, my, 1), qChr), prevCr, HUFF.dcChr, HUFF.acChr);
		}
	}
	for (const byte of writer.flush()) out.push(byte);
	push(0xff, 0xd9);

	return Buffer.from(out);
}

// --- Р РёСЃРѕРІР°РЅРёРµ ---

function makeCanvas(w, h) {
	return { w, h, data: Buffer.alloc(w * h * 3, 0) };
}

function setPixel(canvas, x, y, color) {
	if (x < 0 || y < 0 || x >= canvas.w || y >= canvas.h) return;
	const i = (y * canvas.w + x) * 3;
	canvas.data[i] = color[0];
	canvas.data[i + 1] = color[1];
	canvas.data[i + 2] = color[2];
}

function fillRect(canvas, x0, y0, w, h, color) {
	for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setPixel(canvas, x, y, color);
}

function fillCircle(canvas, cx, cy, radius, color) {
	for (let y = cy - radius; y <= cy + radius; y++) {
		for (let x = cx - radius; x <= cx + radius; x++) {
			const dx = x - cx;
			const dy = y - cy;
			if (dx * dx + dy * dy <= radius * radius) setPixel(canvas, x, y, color);
		}
	}
}

// --- Сглаженная графика (антиалиасинг) ---

// Смешивает цвет с учётом альфы (0..1) — убирает рваные края.
function blendPixel(canvas, x, y, color, alpha) {
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

// Круг с плавными краями: для каждого пикселя считаем покрытие по расстоянию до границы.
function aaCircle(canvas, cx, cy, radius, color, alpha) {
	const A = alpha === undefined ? 1 : alpha;
	const x0 = Math.floor(cx - radius - 1);
	const x1 = Math.ceil(cx + radius + 1);
	const y0 = Math.floor(cy - radius - 1);
	const y1 = Math.ceil(cy + radius + 1);
	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
			const coverage = Math.max(0, Math.min(1, radius + 0.5 - dist));
			blendPixel(canvas, x, y, color, coverage * A);
		}
	}
}

// Отрезок с плавными краями.
function aaLine(canvas, x0, y0, x1, y1, width, color, alpha) {
	const A = alpha === undefined ? 1 : alpha;
	const half = width / 2;
	const minX = Math.floor(Math.min(x0, x1) - half - 1);
	const maxX = Math.ceil(Math.max(x0, x1) + half + 1);
	const minY = Math.floor(Math.min(y0, y1) - half - 1);
	const maxY = Math.ceil(Math.max(y0, y1) + half + 1);
	const dx = x1 - x0;
	const dy = y1 - y0;
	const lenSq = dx * dx + dy * dy || 1;
	for (let y = minY; y <= maxY; y++) {
		for (let x = minX; x <= maxX; x++) {
			const px = x + 0.5 - x0;
			const py = y + 0.5 - y0;
			let t = (px * dx + py * dy) / lenSq;
			t = Math.max(0, Math.min(1, t));
			const dist = Math.hypot(px - t * dx, py - t * dy);
			const coverage = Math.max(0, Math.min(1, half + 0.5 - dist));
			blendPixel(canvas, x, y, color, coverage * A);
		}
	}
}

// Прямоугольник со скруглением и сглаживанием.
function aaRoundRect(canvas, x0, y0, w, h, radius, color, alpha) {
	const A = alpha === undefined ? 1 : alpha;
	const x1 = x0 + w;
	const y1 = y0 + h;
	for (let y = Math.floor(y0 - 1); y <= Math.ceil(y1 + 1); y++) {
		for (let x = Math.floor(x0 - 1); x <= Math.ceil(x1 + 1); x++) {
			const px = x + 0.5;
			const py = y + 0.5;
			const cx = Math.max(x0 + radius, Math.min(px, x1 - radius));
			const cy = Math.max(y0 + radius, Math.min(py, y1 - radius));
			const dist = Math.hypot(px - cx, py - cy);
			const coverage = Math.max(0, Math.min(1, radius + 0.5 - dist));
			blendPixel(canvas, x, y, color, coverage * A);
		}
	}
}

// Дуга кольца (для иконки питания).
function aaArc(canvas, cx, cy, radius, thickness, startAngle, endAngle, color, alpha) {
	const A = alpha === undefined ? 1 : alpha;
	const half = thickness / 2;
	const x0 = Math.floor(cx - radius - half - 1);
	const x1 = Math.ceil(cx + radius + half + 1);
	const y0 = Math.floor(cy - radius - half - 1);
	const y1 = Math.ceil(cy + radius + half + 1);
	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			const dx = x + 0.5 - cx;
			const dy = y + 0.5 - cy;
			const dist = Math.hypot(dx, dy);
			let angle = Math.atan2(dy, dx);
			if (angle < startAngle) angle += Math.PI * 2;
			if (angle > endAngle) continue;
			const coverage = Math.max(0, Math.min(1, half + 0.5 - Math.abs(dist - radius)));
			blendPixel(canvas, x, y, color, coverage * A);
		}
	}
}

function fillCanvas(canvas, color) {
	fillRect(canvas, 0, 0, canvas.w, canvas.h, color);
}

// --- Оформление в стиле Cyberpunk 2077 ---

// Тонкая сетка на фоне плюс мягкое свечение сверху.
function gridBackdrop(canvas) {
	fillCanvas(canvas, COLORS.bg);
	for (let y = 0; y < canvas.h; y++) {
		const t = Math.max(0, 1 - y / 55);
		const k = t * t * 0.13;
		for (let x = 0; x < canvas.w; x++) {
			const i = (y * canvas.w + x) * 3;
			canvas.data[i] = Math.min(255, Math.round(canvas.data[i] + 30 * k));
			canvas.data[i + 1] = Math.min(255, Math.round(canvas.data[i + 1] + 255 * k * 0.5));
			canvas.data[i + 2] = Math.min(255, Math.round(canvas.data[i + 2] + 220 * k * 0.35));
		}
	}
	for (let x = 6; x < canvas.w; x += 12) {
		for (let y = 0; y < canvas.h; y++) blendPixel(canvas, x, y, COLORS.line, 0.55);
	}
	for (let y = 6; y < canvas.h; y += 12) {
		for (let x = 0; x < canvas.w; x++) blendPixel(canvas, x, y, COLORS.line, 0.55);
	}
}

// Уголки-скобки как у HUD.
function cornerBrackets(canvas, color) {
	const L = 12;
	const T = 2.5;
	const m = 3;
	const pts = [
		[m, m, m + L, m], [m, m, m, m + L],
		[canvas.w - m, m, canvas.w - m - L, m], [canvas.w - m, m, canvas.w - m, m + L],
		[m, canvas.h - m, m + L, canvas.h - m], [m, canvas.h - m, m, canvas.h - m - L],
		[canvas.w - m, canvas.h - m, canvas.w - m - L, canvas.h - m], [canvas.w - m, canvas.h - m, canvas.w - m, canvas.h - m - L],
	];
	for (const q of pts) aaLine(canvas, q[0], q[1], q[2], q[3], T, color, 1);
}

// Круг с неоновым свечением.
function neonCircle(canvas, cx, cy, radius, color, glow) {
	const g = glow === undefined ? 1.9 : glow;
	for (let pass = 0; pass < 3; pass++) {
		const rr = radius + (2 - pass) * 2.4 * g;
		const a = 0.09 + pass * 0.09;
		aaCircle(canvas, cx, cy, rr, color, a);
	}
	aaCircle(canvas, cx, cy, radius, color, 1);
}

// Дуга питания с неоновым ореолом (разрыв сверху).
function neonArc(canvas, cx, cy, radius, thickness, color) {
	const a0 = -Math.PI / 2 + 0.52;
	const a1 = Math.PI * 1.5 - 0.52;
	aaArc(canvas, cx, cy, radius, thickness + 5, a0, a1, color, 0.13);
	aaArc(canvas, cx, cy, radius, thickness + 2.5, a0, a1, color, 0.22);
	aaArc(canvas, cx, cy, radius, thickness, a0, a1, color, 1);
}

// Линия с неоновым ореолом.
function neonLine(canvas, x0, y0, x1, y1, width, color) {
	aaLine(canvas, x0, y0, x1, y1, width + 4, color, 0.14);
	aaLine(canvas, x0, y0, x1, y1, width + 2, color, 0.24);
	aaLine(canvas, x0, y0, x1, y1, width, color, 1);
}

const COLORS = {
	bg: [10, 10, 12],
	bg2: [16, 18, 22],
	on: [214, 255, 40],
	accent: [60, 255, 230],
	hot: [255, 60, 150],
	off: [255, 60, 90],
	amber: [255, 200, 20],
	blue: [60, 200, 255],
	grey: [110, 118, 130],
	dim: [34, 36, 42],
	line: [40, 44, 52],
	text: [232, 238, 245],
};

function toDataUrl(canvas) {
	return 'data:image/jpeg;base64,' + encodeJpeg(canvas.w, canvas.h, canvas.data).toString('base64');
}


﻿// --- Иконки ---

function drawPower(on) {
	const c = makeCanvas(KEY_W, KEY_H);
	gridBackdrop(c);

	const color = on ? COLORS.on : COLORS.off;
	cornerBrackets(c, color);

	// Power glyph: arc + stem
	neonArc(c, 47.5, 50, 21, 5.5, color);
	neonLine(c, 47.5, 20, 47.5, 41, 5.5, color);

	// status dot below
	if (on) {
		neonCircle(c, 47.5, 76, 4, COLORS.on);
	} else {
		neonLine(c, 40, 83, 55, 69, 3.5, COLORS.off);
	}

	return toDataUrl(c);
}
function drawModeLabel(mode) {
	const c = makeCanvas(KEY_W, KEY_H);
	gridBackdrop(c);

	const color = mode === 'global' ? COLORS.hot : mode === 'direct' ? COLORS.grey : COLORS.accent;
	cornerBrackets(c, color);

	// three bars: rule=1, direct=2, global=3 filled
	const filled = mode === 'global' ? 3 : mode === 'direct' ? 2 : 1;
	for (let i = 0; i < 3; i++) {
		const x = 22 + i * 21;
		const h = 12 + i * 7;
		const y = 58 - h;
		if (i < filled) {
			aaRoundRect(c, x, y, 11, h, 1.5, color, 1);
			aaRoundRect(c, x - 2, y - 2, 15, h + 4, 2, color, 0.14);
		} else {
			aaRoundRect(c, x, y, 11, h, 1.5, COLORS.dim, 1);
		}
	}

	const label = mode === 'global' ? 'GLOBAL' : mode === 'direct' ? 'DIRECT' : 'RULE';
	drawText(c, label, { x: 4, y: 66, w: KEY_W - 8, h: 24, scale: 1, tracking: 1, color: COLORS.text, noShrink: true });

	return toDataUrl(c);
}
function drawServer(badge, label) {
	const c = makeCanvas(KEY_W, KEY_H);
	gridBackdrop(c);
	cornerBrackets(c, COLORS.accent);

	// Country badge: outlined plate with the code inside
	const bx = 24;
	const bw = 47;
	aaRoundRect(c, bx - 2, 12, bw + 4, 30, 3, COLORS.accent, 0.08);
	aaRoundRect(c, bx, 14, bw, 26, 2.5, COLORS.accent, 1);
	aaRoundRect(c, bx + 1.5, 15.5, bw - 3, 23, 2, COLORS.bg, 1);
	drawText(c, String(badge || '--').toUpperCase(), { x: bx, y: 16, w: bw, h: 22, scale: 1, tracking: 1, color: COLORS.accent, noShrink: true });

	// Server name below the badge
	drawText(c, String(label || ''), { x: 2, y: 60, w: KEY_W - 4, h: 26, scale: 1, tracking: 0, color: COLORS.text, noShrink: true });

	return toDataUrl(c);
}
function drawSpeed(down, up) {
	const c = makeCanvas(KEY_W, KEY_H);
	gridBackdrop(c);
	cornerBrackets(c, COLORS.accent);

	// Значения ("607КБ") занимают немного места, поэтому
	// стрелка — компактный маркер в левом поле, а текст центрируется
	// в оставшейся части и всегда одного размера (scale 1).
	const AX = 6;
	const TX = 12;
	const TW = KEY_W - TX;

	// Загрузка (стрелка вниз)
	neonLine(c, AX, 17, AX, 29, 2.5, COLORS.blue);
	neonLine(c, AX, 31, 3, 23, 2.5, COLORS.blue);
	neonLine(c, AX, 31, 11, 23, 2.5, COLORS.blue);
	drawText(c, down, { x: TX, y: 10, w: TW, h: 28, scale: 1, tracking: -1, color: COLORS.blue, noShrink: true });

	// Отдача (стрелка вверх)
	neonLine(c, AX, 77, AX, 65, 2.5, COLORS.on);
	neonLine(c, AX, 63, 3, 71, 2.5, COLORS.on);
	neonLine(c, AX, 63, 11, 71, 2.5, COLORS.on);
	drawText(c, up, { x: TX, y: 56, w: TW, h: 28, scale: 1, tracking: -1, color: COLORS.on, noShrink: true });

	return toDataUrl(c);
}

function drawOffline() {
	const c = makeCanvas(KEY_W, KEY_H);
	gridBackdrop(c);
	cornerBrackets(c, COLORS.off);

	neonLine(c, 26, 62, 68, 20, 5, COLORS.off);
	drawText(c, 'NO API', { x: 4, y: 64, w: KEY_W - 8, h: 24, scale: 1, tracking: 1, color: COLORS.off, noShrink: true });

	return toDataUrl(c);
}
function humanRate(bytesPerSecond) {
	const v = bytesPerSecond;
	if (!Number.isFinite(v) || v <= 0) return '0Б';

	// Единица с постфиксом без /с: на кнопке и так понятно, что это скорость.
	if (v < 1000) return Math.round(v) + 'Б';

	const kb = v / 1000;
	if (kb < 1000) return Math.round(kb) + 'КБ';

	const mb = v / 1000000;
	if (mb < 1000) return Math.round(mb) + 'МБ';

	const gb = v / 1000000000;
	return Math.round(gb) + 'ГБ';
}

module.exports = { drawPower, drawModeLabel, drawServer, drawSpeed, drawOffline, humanRate, encodeJpeg, KEY_W, KEY_H };