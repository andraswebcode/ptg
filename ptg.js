const PTG = (function(exports) {

	class ProceduralTextureGenerator {

		program = [];

		blendModes = {
			set:(x, y) => y,
			add:(x, y) => x + y,
			subtract:(x, y) => x - y,
			multiply:(x, y) => x * y,
			divide:(x, y) => x / y,
			and:(x, y) => x & y,
			or:(x, y) => x | y,
			xor:(x, y) => x ^ y,
			screen:(x, y) => 1 - (1 - x) * (1 - y),
			difference:(x, y) => Math.abs(x - y),
			darken:(x, y) => Math.min(x, y),
			lighten:(x, y) => Math.max(x, y),
			overlay:(x, y) => y < 128 ? 2 * x * y : 1 - 2 * (1 - x) * (1 - y),
			exclusion:(x, y) => x + y - (2 * x * y)
		};

		algorithms = {
			tint:() => this.blendColor.set(1),
			sinX:(program, x, y) => {
				const {
					offset = 0,
					frequency = 0.01
				} = program;
				return this.blendColor.set(Math.sin((x + offset) * frequency * Math.PI));
			},
			sinY:(program, x, y) => {
				const {
					offset = 0,
					frequency = 0.01
				} = program;
				return this.blendColor.set(Math.sin((y + offset) * frequency * Math.PI));
			},
			or:(program, x, y) => this.blendColor.set((x | y) / this.width),
			xor:(program, x, y) => this.blendColor.set((x ^ y) / this.width),
			checkerBoard:(program, x, y) => {
				const {
					size = [32, 32],
					offset = [0, 0],
					rowShift = 0
				} = program;
				return this.blendColor.set((((y + offset[1]) / size[1]) & 1) ^ (((x + offset[0] + parseInt(y / size[1]) * rowShift) / size[0]) & 1) ? 0 : 1);
			},
			rectangle:(program, x, y) => {
				const {
					size = [32, 32],
					position = [0, 0]
				} = program;
				return this.blendColor.set((x >= position[0] && x <= (position[0] + size[0]) && y <= (position[1] + size[1]) && y >= position[1]) ? 1 : 0);
			},
			circle:(program, x, y) => {
				const {
					position = [0, 0],
					radius = 40,
					delta = 1
				} = program;
				const dist = distance(x, y, position[0], position[1]);
				return this.blendColor.set(1 - smoothStep(radius - delta, radius, dist));
			},
			noise:(program, x, y) => {
				const {
					seed = 0
				} = program;
				return this.blendColor.set(hashRNG(seed, x, y));
			},
			fractalNoise:(program, x, y) => {
				let {
					interpolation = 'step',
					seed = 0,
					baseFrequency = 0.03125,
					amplitude = 0.4,
					persistence = 0.72,
					octaves = 4,
					step = 4
				} = program;
				let v = 0, x1, y1, dx, dy, v1, v2, v3, v4, i1, i2, i;
				let frequency = 1 / baseFrequency;
				const interpolator = new ColorInterpolator(interpolation);
				for (i = 1; i <= octaves; i++){
					x1 = Math.floor(x * frequency);
					y1 = Math.floor(y * frequency);
					if (interpolator.interpolation === 'step'){
						v += hashRNG(seed * i, x1, y1) * amplitude;
					} else {
						dx = (x * frequency) - x1;
						dy = (y * frequency) - y1;
						v1 = hashRNG(seed * i, x1 + 0, y1 + 0);
						v2 = hashRNG(seed * i, x1 + 1, y1 + 0);
						v3 = hashRNG(seed * i, x1 + 0, y1 + 1);
						v4 = hashRNG(seed * i, x1 + 1, y1 + 1);
						interpolator.set([{
							pos:0,
							color:[v1]
						},{
							pos:1,
							color:[v2]
						}]);
						i1 = interpolator.getColorAt(dx);
						interpolator.set([{
							pos:0,
							color:[v3]
						},{
							pos:1,
							color:[v4]
						}]);
						i2 = interpolator.getColorAt(dx);
						interpolator.set([{
							pos:0,
							color:[i1[0]]
						},{
							pos:1,
							color:[i2[0]]
						}]);
						v += interpolator.getColorAt(dy)[0] * amplitude;
					}
					frequency *= step;
					amplitude *= persistence;
				}
				return this.blendColor.set(v);
			},
			cellularNoise:(program, x, y) => {
				const {
					seed = 0,
					density = 32,
					weightRange = 0
				} = program;
				const {
					dist
				} = cellNoiseBase(x, y, seed, density, Math.max(0, weightRange));
				let v = 1 - (dist / density);
				if (density < 0){
					v -= 1;
				}
				return this.blendColor.set(v);
			},
			voronoiNoise:(program, x, y) => {
				const {
					seed = 0,
					density = 32,
					weightRange = 0
				} = program;
				return this.blendColor.set(cellNoiseBase(x, y, seed, density, Math.max(0, weightRange)).value);
			},
			perlinNoise:(program, x, y) => {
				const {
					seed = 0,
					density = 32
				} = program;
				return this.blendColor.set(perlinNoiseBase(x, y, seed, density));
			},
			cellularFractal:(program, x, y) => {
				let {
					seed = 0,
					weightRange = 0,
					baseDensity = 64,
					amplitude = 0.7,
					persistence = 0.45,
					octaves = 4,
					step = 2
				} = program;
				let p, v = 0, i;
				for (i = 1; i <= octaves; i++){
					p = cellNoiseBase(x, y, seed * i, baseDensity, Math.max(0, weightRange));
					p.dist = 1 - (p.dist / baseDensity);
					if (baseDensity < 0){
						p.dist -= 1;
					}
					v += p.dist * amplitude;
					baseDensity /= step;
					amplitude *= persistence;
				}
				return this.blendColor.set(v);
			},
			voronoiFractal:(program, x, y) => {
				let {
					seed = 0,
					weightRange = 0,
					baseDensity = 64,
					amplitude = 0.6,
					persistence = 0.6,
					octaves = 4,
					step = 2
				} = program;
				let p, v = 0, i;
				for (i = 1; i <= octaves; i++){
					p = cellNoiseBase(x, y, seed * i, baseDensity, Math.max(0, weightRange));
					v += p.value * amplitude;
					baseDensity /= step;
					amplitude *= persistence;
				}
				return this.blendColor.set(v);
			},
			perlinFractal:(program, x, y) => {},
			transform:(program, x, y) => {
				const {
					offset = [0, 0],
					angle = 0,
					scale = [1, 1]
				} = program;
				const angleRad = degToRad(angle);
				const x2 = x - this.width / 2;
				const y2 = y - this.height / 2;
				let s = x2 * (Math.cos(angleRad) / scale[0]) + y2 * - (Math.sin(angleRad) / scale[0]);
				let t = x2 * (Math.sin(angleRad) / scale[1]) + y2 * (Math.cos(angleRad) / scale[1]);
				s += offset[0] + this.width / 2;
				t += offset[1] + this.height / 2;
				return this.blendColor.set(this.bufferCopy.getPixelBilinear(s, t));
			},
			sineDistort:(program, x, y) => {
				const {
					sines = [4, 4],
					offset = [0, 0],
					amplitude = [16, 16]
				} = program;
				const s = Math.sin(sines[0] / 100 * y + offset[0]) * amplitude[0] + x;
				const t = Math.sin(sines[1] / 100 * x + offset[1]) * amplitude[1] + y;
				return this.blendColor.set(this.bufferCopy.getPixelBilinear(s, t));
			},
			twirl:(program, x, y) => {
				const {
					strength = 200,
					radius = 40,
					position = [50, 50]
				} = program;
				const str = strength / 100;
				let dist = distance(x, y, position[0], position[1]);
				let s = x, t = y;
				if (dist < radius){
					dist = Math.pow(radius - dist, 2) / radius;
					const angle = 2.0 * Math.PI * (dist / (radius / str));
					s = (((x - position[0]) * Math.cos(angle)) - ((y - position[0]) * Math.sin(angle)) + position[0] + 0.5);
					t = (((y - position[1]) * Math.cos(angle)) + ((x - position[1]) * Math.sin(angle)) + position[1] + 0.5);
				}
				return this.blendColor.set(this.bufferCopy.getPixelBilinear(s, t));
			}
		};

		constructor(canvas){

			const {
				width,
				height
			} = canvas;

			this.ctx = canvas.getContext('2d');
			this.imageData = this.ctx.createImageData(width, height);
			this.buffer = new Buffer(width, height);
			this.bufferCopy = new Buffer(width, height);
			this.width = width;
			this.height = height;
			this.blendColor = new Color();
			this.tintColor = new Color();

		}

		add(program){
			this.program.push(program);
			return this;
		}

		set(program){
			this.program = program;
			this.reset();
			this.draw();
			return this;
		}

		draw(){

			const {
				ctx,
				width,
				imageData,
				buffer,
				bufferCopy,
				tintColor,
				program,
				blendModes
			} = this;
			const data = imageData.data;
			const array = buffer.array;
			let i, j, p, c, t, x = 0, y = 0;

			for (i = 0; i < program.length; i++){
				bufferCopy.copy(buffer);
				p = program[i];
				t = tintColor.set(p.tint);
				for (j = 0; j < data.length; j += 4){
					c = this.algorithms[p.program](p, x, y);
					array[j + 0] = blendModes[p.blendMode || 'set'](array[j + 0], c.multiply(t).r);
					array[j + 1] = blendModes[p.blendMode || 'set'](array[j + 1], c.multiply(t).g);
					array[j + 2] = blendModes[p.blendMode || 'set'](array[j + 2], c.multiply(t).b);
					if (++x === width){
						x = 0;
						y++;
					}
				}
				x = 0;
				y = 0;
			}

			for (i = 0; i < data.length; i += 4){
				data[i + 0] = array[i + 0] * 255;
				data[i + 1] = array[i + 1] * 255;
				data[i + 2] = array[i + 2] * 255;
				data[i + 3] = 255;
			}

			ctx.putImageData(imageData, 0, 0);

			return this;

		}

		reset(){
			this.buffer = new Buffer(this.width, this.height);
			return this;
		}

	}

	class Buffer {

		constructor(width, height){
			this.array = new Float32Array(width * height * 4);
			this.color = new Color();
			this.width = width;
			this.height = height;
		}

		copy(buffer){
			this.array.set(buffer.array);
			return this;
		}

		getPixelNearest(x, y){}

		getPixelBilinear(x, y){

			const {
				width,
				height,
				array,
				color
			} = this;
			const px = Math.floor(x);
			const py = Math.floor(y);
			const p0 = px + py * width;
			const fx = x - px;
			const fy = y - py;
			const fx1 = 1 - fx;
			const fy1 = 1 - fy;
			const w1 = fx1 * fy1;
			const w2 = fx  * fy1;
			const w3 = fx1 * fy;
			const w4 = fx  * fy;
			const len = width * height * 4;
			let p1 = p0 * 4;
			let p2 = (1 + p0) * 4;
			let p3 = (1 * width + p0) * 4;
			let p4 = (1 + 1 * width + p0) * 4;

			if ( p1 >= len ) p1 -= len;
			if ( p1 < 0 ) p1 += len;
			if ( p2 >= len ) p2 -= len;
			if ( p2 < 0 ) p2 += len;
			if ( p3 >= len ) p3 -= len;
			if ( p3 < 0 ) p3 += len;
			if ( p4 >= len ) p4 -= len;
			if ( p4 < 0 ) p4 += len;

			return color
			.setR(array[p1 + 0] * w1 + array[p2 + 0] * w2 + array[p3 + 0] * w3 + array[p4 + 0] * w4)
			.setG(array[p1 + 1] * w1 + array[p2 + 1] * w2 + array[p3 + 1] * w3 + array[p4 + 1] * w4)
			.setB(array[p1 + 2] * w1 + array[p2 + 2] * w2 + array[p3 + 2] * w3 + array[p4 + 2] * w4);

		}

	}

	class Color {

		constructor(r, g, b){
			this.set(r, g, b);
		}

		set(r, g, b){
			if (typeof r === 'undefined'){
				r = 0;
			} else if (r instanceof this.constructor){
				return this.set(r.r, r.g, r.b);
			}
			if (typeof r === 'number'){
				this.r = r;
				this.g = typeof g === 'undefined' ? r : g;
				this.b = typeof b === 'undefined' ? r : b;
			} else {
				this.r = r[0];
				this.g = r[1];
				this.b = r[2];
			}
			return this;
		}

		setR(value){
			this.r = value;
			return this;
		}

		setG(value){
			this.g = value;
			return this;
		}

		setB(value){
			this.b = value;
			return this;
		}

		add(color){
			this.r = this.r + color.r;
			this.g = this.g + color.g;
			this.b = this.b + color.b;
			return this;
		}

		multiply(color){
			this.r = this.r * color.r;
			this.g = this.g * color.g;
			this.b = this.b * color.b;
			return this;
		}

		toRGB(){
			const {r, g, b} = this;
			return `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
		}

	}

	class ColorInterpolator {

		constructor(method = 'linear'){
			this.points = [];
			this.low = 0;
			this.high = 0;
			this.interpolation = method;
			this.repeat = false;
		}

		set(points){
			this.points = points;
			this.points.sort((a, b) => a.pos - b.pos);
			this.low = this.points[0].pos;
			this.high = this.points[this.points.length - 1].pos;
			return this;
		}

		getColorAt(pos){

			const {
				repeat,
				low,
				high,
				points,
				interpolation
			} = this;

			if (repeat === 2){
				pos = mirroredWrap(pos, low, high);
			} else if (repeat){
				wrap(pos, low, high);
			} else {
				clamp(pos, low, high);
			}

			let i = 0;

			while (points[i + 1].pos < pos){
				i++;
			}

			const p1 = points[i];
			const p2 = points[i + 1];
			const delta = (pos - p1.pos) / (p2.pos - p1.pos);

			if (interpolation === 'step'){
				return p1.color;
			} else if (interpolation === 'linear'){
				return mixColors(p1.color, p2.color, delta);
			} else if (interpolation === 'spline'){
				const ar =  2 * p1.color[0] - 2 * p2.color[0];
				const br = -3 * p1.color[0] + 3 * p2.color[0];
				const dr = p1.color[0];
				const ag =  2 * p1.color[1] - 2 * p2.color[1];
				const bg = -3 * p1.color[1] + 3 * p2.color[1];
				const dg = p1.color[ 1 ];
				const ab =  2 * p1.color[2] - 2 * p2.color[2];
				const bb = -3 * p1.color[2] + 3 * p2.color[2];
				const db = p1.color[2];
				const delta2 = delta * delta;
				const delta3 = delta2 * delta;
				return [
					ar * delta3 + br * delta2 + dr,
					ag * delta3 + bg * delta2 + dg,
					ab * delta3 + bb * delta2 + db
				];
			}

		}

	}

	function hashRNG(seed, x, y) {
		seed = (Math.abs(seed % 2147483648) === 0) ? 1 : seed;
		let a = ((seed * (x + 1) * 777) ^ (seed * (y + 1) * 123)) % 2147483647;
		a = (a ^ 61) ^ (a >> 16);
		a = a + (a << 3);
		a = a ^ (a >> 4);
		a = a * 0x27d4eb2d;
		a = a ^ (a >> 15);
		a = a / 2147483647;
		return a;
	}

	function cellNoiseBase(x, y, seed, density, weightRange) {

		let qx, qy, rx, ry, w, px, py, dx, dy;
		let dist, value;
		let shortest = Infinity;
		density = Math.abs(density);

		for (let sx = -2; sx <= 2; sx++){
			for (let sy = -2; sy <= 2; sy++){
				qx = Math.ceil(x / density) + sx;
				qy = Math.ceil(y / density) + sy;
				rx = hashRNG(seed, qx, qy);
				ry = hashRNG(seed * 2, qx, qy);
				w = (weightRange > 0) ? 1 + hashRNG(seed * 3, qx, qy) * weightRange : 1;
				px = (rx + qx) * density;
				py = (ry + qy) * density;
				dx = Math.abs(px - x);
				dy = Math.abs(py - y);
				dist =	(dx * dx + dy * dy) * w;
				if (dist < shortest){
					shortest = dist;
					value = rx;
				}
			}
		}

		return {
			dist:Math.sqrt(shortest),
			value
		};

	}

	// https://joeiddon.github.io/projects/javascript/perlin.html
	function perlinNoiseBase(x, y, seed, density) {

		const x0 = Math.ceil(x / density);
		const y0 = Math.ceil(y / density);
		const x1 = x0 + 1;
		const y1 = y0 + 1;
		const sx = x - x0;
		const sy = y - y0;

		let n0, n1, ix0, ix1;

		n0 = dotGridGradient(x0, y0, x, y);
		n1 = dotGridGradient(x1, y0, x, y);
		ix0 = interpolate(n0, n1, sx);

		n0 = dotGridGradient(x0, y1, x, y);
		n1 = dotGridGradient(x1, y1, x, y);
		ix1 = interpolate(n0, n1, sx);

		return interpolate(ix0, ix1, sy);

	}

	function dotGridGradient(ix, iy, x, y) {

		const theta = Math.random() * 2 * Math.PI;
		const rx = Math.cos(theta);
		const ry = Math.sin(theta);
		const dx = x - ix;
		const dy = y - iy;

		return dx * rx + dy * ry;

	}

	function interpolate(a, b, t) {
		return (b - a) * t + a;
	}

	function mirroredWrap(value, min, max) {
		const r = (max - min) * 2;
		const v = ( r + (value - min) % r ) % r;
		if (v > max - min) {
			return (r - v) + min;
		} else {
			return v + min;
		}
	}

	function wrap(value, min, max) {
		const v = value - min;
		const r = max - min;
		return ((r + v % r) % r) + min;
	}

	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	function mixColors(c1, c2, delta) {
		return [
			c1[0] * (1 - delta) + c2[0] * delta,
			c1[1] * (1 - delta) + c2[1] * delta,
			c1[2] * (1 - delta) + c2[2] * delta,
			c1[3] * (1 - delta) + c2[3] * delta
		];
	}

	function distance(x0, y0, x1, y1) {
		const dx = x1 - x0;
		const dy = y1 - y0;
		return Math.sqrt(dx * dx + dy * dy);
	}

	function smoothStep(edge0, edge1, x) {
		x = clamp((x - edge0) / (edge1 - edge0), 0, 1);
		return x * x * (3 - 2 * x);
	}

	function degToRad(deg) {
		return deg * Math.PI / 180
	}

	exports.ProceduralTextureGenerator = ProceduralTextureGenerator;
	exports.Buffer = Buffer;
	exports.Color = Color;
	exports.ColorInterpolator = ColorInterpolator;
	exports.utils = {
		hashRNG,
		cellNoiseBase,
		mirroredWrap,
		wrap,
		mixColors,
		distance,
		smoothStep,
		degToRad
	};
	return exports;

})({});
