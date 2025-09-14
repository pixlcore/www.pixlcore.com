// Curves Demonstration Plugin for PixlCore Blog

// pixl-curves - Image filters for use on canvas
// Copyright (c) 2024 Joseph Huckaby and PixlCore
// Borrowed from canvas-plus, also by me.
// Released under the MIT License

/** 
 * Apply curves and related image filters to HTML5 Canvas pixels.
 */
class Curve {
	
	/**
	 * Construct a Curve class instance.
	 * @param {Object} canvas - A pre-created HTML5 Canvas object.
	 */
	constructor(canvas) {
		this.canvas = canvas;
		this.context = canvas.getContext('2d');
		this.width = canvas.width;
		this.height = canvas.height;
		this.reset();
	}
	
	/** 
	 * Reset current curve to flat ramp.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	reset() {
		// reset curve to flat ramp
		this.curve = { red: [], green: [], blue: [], alpha: [] };
		
		for (let idx = 0; idx < 256; idx++) {
			this.curve.red[idx] = idx;
			this.curve.green[idx] = idx;
			this.curve.blue[idx] = idx;
			this.curve.alpha[idx] = idx;
		}
		
		return this;
	}
	
	/** 
	 * Build points into curve, and apply on top of current curve.
	 * @param {Object} opts - Options for apply.
	 * @param {number[]} [opts.rgb] - RGB curve array (specify all three channels as one).
	 * @param {number[]} [opts.red] - Red channel specific curve array.
	 * @param {number[]} [opts.green] - Green channel specific curve array.
	 * @param {number[]} [opts.blue] - Blue channel specific curve array.
	 * @param {number[]} [opts.alpha] - Alpha channel specific curve array.
	 * @param {string} [opts.algo] - Override interpolation scheme, e.g. 'linear'.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	apply(opts) {
		// build points into curve, and apply on top of current curve
		// opts: { rgb, red, green, blue, alpha, algo }
		if (!opts || !Object.keys(opts).length) {
			throw new Error("No curves options were provided");
		}
		this.validate(opts, {
			rgb: { type: 'object', required: false },
			red: { type: 'object', required: false },
			green: { type: 'object', required: false },
			blue: { type: 'object', required: false },
			alpha: { type: 'object', required: false },
			algo: { type: 'string', required: false }
		});
		
		let curve_rgb = opts.rgb ? this.generateCurve(opts.rgb, opts.algo) : null;
		let curve_red = opts.red ? this.generateCurve(opts.red, opts.algo) : null;
		let curve_green = opts.green ? this.generateCurve(opts.green, opts.algo) : null;
		let curve_blue = opts.blue ? this.generateCurve(opts.blue, opts.algo) : null;
		let curve_alpha = opts.alpha ? this.generateCurve(opts.alpha, opts.algo) : null;
		
		if (curve_rgb) {
			curve_red = curve_green = curve_blue = curve_rgb;
		}
		
		for (let idx = 0; idx < 256; idx++) {
			if (curve_red) this.curve.red[idx] = curve_red[ this.curve.red[idx] ];
			if (curve_green) this.curve.green[idx] = curve_green[ this.curve.green[idx] ];
			if (curve_blue) this.curve.blue[idx] = curve_blue[ this.curve.blue[idx] ];
			if (curve_alpha) this.curve.alpha[idx] = curve_alpha[ this.curve.alpha[idx] ];
		}
		
		return this;
	}
	
	/** 
	 * Render current curve to canvas pixels.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	render() {
		// apply curve to image channels
		let curve_red = this.curve.red;
		let curve_green = this.curve.green;
		let curve_blue = this.curve.blue;
		let curve_alpha = this.curve.alpha;
		
		let width = this.width;
		let height = this.height;
		let imgData = this.context.getImageData(0, 0, width, height);
		let offset = 0;
		
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				imgData.data[ offset + 0 ] = curve_red[ imgData.data[ offset + 0 ] ];
				imgData.data[ offset + 1 ] = curve_green[ imgData.data[ offset + 1 ] ];
				imgData.data[ offset + 2 ] = curve_blue[ imgData.data[ offset + 2 ] ];
				imgData.data[ offset + 3 ] = curve_alpha[ imgData.data[ offset + 3 ] ];
				offset += 4;
			} // x loop
		} // y loop
		
		this.context.putImageData( imgData, 0, 0 );
		return this;
	}
	
	/** 
	 * Add posterize effect using stair-step curve with N levels.
	 * @param {(Object|number)} opts - Options for filter or posterize levels.
	 * @param {number} [opts.levels=4] - Number of posterize levels.
	 * @param {string} [opts.channels=rgb] - Which channels to apply filter to.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	posterize(opts = {}) {
		// apply posterize effect using stair-step curve with N levels
		// opts: { levels, channels }
		if (typeof(opts) == 'number') opts = { levels: opts };
		
		this.validate(opts, {
			levels: { type: 'number', min: 1, max: 128, required: false },
			channels: { type: 'string', match: /^r?g?b?a?$/i, required: false }
		});
		
		let levels = Math.floor( 256 / (opts.levels || 4) );
		let curve = [];
		
		for (let idx = 0; idx < 256; idx++) {
			curve.push( Math.min(255, Math.round( idx / levels ) * levels) );
		}
		
		let channels = opts.channels || 'rgb';
		delete opts.channels;
		delete opts.levels;
		
		if (channels.match(/rgb/i)) opts.rgb = curve;
		else {
			if (channels.match(/r/i)) opts.red = curve;
			if (channels.match(/g/i)) opts.green = curve;
			if (channels.match(/b/i)) opts.blue = curve;
		}
		if (channels.match(/a/i)) opts.alpha = curve;
		
		return this.apply(opts);
	}
	
	/** 
	 * Apply solarize effect using 'v' curve.
	 * @param {Object} opts - Options for filter.
	 * @param {string} [opts.channels=rgb] - Which channels to apply filter to.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	solarize(opts = {}) {
		// apply solarize effect using 'v' curve
		// opts: { channels }
		let curve = [];
		
		this.validate(opts, {
			channels: { type: 'string', match: /^r?g?b?a?$/i, required: false }
		});
		
		for (let idx = 0; idx < 256; idx++) {
			curve.push( (idx < 128) ? idx : (255 - idx) );
		}
		
		let channels = opts.channels || 'rgb';
		delete opts.channels;
		
		if (channels.match(/rgb/i)) opts.rgb = curve;
		else {
			if (channels.match(/r/i)) opts.red = curve;
			if (channels.match(/g/i)) opts.green = curve;
			if (channels.match(/b/i)) opts.blue = curve;
		}
		if (channels.match(/a/i)) opts.alpha = curve;
		
		return this.apply(opts);
	}
	
	/** 
	 * Invert channels using curve.
	 * @param {Object} opts - Options for filter.
	 * @param {string} [opts.channels=rgb] - Which channels to apply filter to.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	invert(opts = {}) {
		// invert channels using curve
		// opts: { channels }
		let curve = [];
		
		this.validate(opts, {
			channels: { type: 'string', match: /^r?g?b?a?$/i, required: false }
		});
		
		for (let idx = 0; idx < 256; idx++) {
			curve.push( 255 - idx );
		}
		
		let channels = opts.channels || 'rgb';
		delete opts.channels;
		
		if (channels.match(/rgb/i)) opts.rgb = curve;
		else {
			if (channels.match(/r/i)) opts.red = curve;
			if (channels.match(/g/i)) opts.green = curve;
			if (channels.match(/b/i)) opts.blue = curve;
		}
		if (channels.match(/a/i)) opts.alpha = curve;
		
		return this.apply(opts);
	}
	
	/** 
	 * Apply color temperature adjustment using curve.
	 * @param {(Object|number)} opts - Options for filter or temperature adjustment.
	 * @param {number} opts.amount - Temperature adjustment value.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	temperature(opts) {
		// apply color temperature adjustment using curve
		// opts: { amount }
		if (typeof(opts) == 'number') opts = { amount: opts };
		
		this.validate(opts, {
			amount: { type: 'number', min: -255, max: 255, required: false }
		});
		
		let curve = [];
		let channel = '';
		let amount = 0;
		
		if (opts.amount > 0) { channel = 'red'; amount = Math.floor(opts.amount / 4); }
		else { channel = 'blue'; amount = 0 - Math.floor(opts.amount / 4); }
		
		for (let idx = 0; idx < 256; idx++) {
			curve.push( Math.min(255, idx + amount) );
		}
		
		delete opts.amount;
		opts[channel] = curve;
		
		return this.apply(opts);
	}
	
	/** 
	 * Apply gamma adjustment using curve.
	 * @param {(Object|number)} opts - Options for filter or gamma amount.
	 * @param {number} opts.amount - Gamma adjustment value.
	 * @param {string} [opts.channels=rgb] - Which channels to apply filter to.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	gamma(opts = {}) {
		// apply gamma adjustment using curve
		// opts: { amount, channels }
		if (typeof(opts) == 'number') opts = { amount: opts };
		
		this.validate(opts, {
			amount: { type: 'number', min: 0.25, max: 4, required: false },
			channels: { type: 'string', match: /^r?g?b?a?$/i, required: false }
		});
		
		let curve = [];
		let gamma = opts.amount || 1;
		
		for (let idx = 0; idx < 256; idx++) {
			curve.push( Math.floor( Math.clamp(255 * Math.pow((idx / 255), gamma), 0, 255) ) );
		}
		
		let channels = opts.channels || 'rgb';
		delete opts.channels;
		delete opts.amount;
		
		if (channels.match(/rgb/i)) opts.rgb = curve;
		else {
			if (channels.match(/r/i)) opts.red = curve;
			if (channels.match(/g/i)) opts.green = curve;
			if (channels.match(/b/i)) opts.blue = curve;
		}
		if (channels.match(/a/i)) opts.alpha = curve;
		
		return this.apply(opts);
	}
	
	/** 
	 * Generate sepia tone using curves (image should be pre-desaturated).
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	sepia(opts = {}) {
		// generate sepia tone using curves
		
		opts.green = [0, 108, 255];
		opts.blue = [0, 64, 255];
		
		return this.apply(opts);
	}
	
	/** 
	 * Normalize (stretch) contrast to expand full range.
	 * @param {Object} opts - Options for filter.
	 * @param {string} [opts.channels=rgb] - Which channels to apply filter to.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	normalize(opts = {}) {
		// normalize (stretch) contrast to expand full range
		// opts: { channels }
		let histo = this.histogram();
		
		this.validate(opts, {
			channels: { type: 'string', match: /^r?g?b?a?$/i, required: false }
		});
		
		// find low and high points
		let lows = { red: 0, green: 0, blue: 0, alpha: 0 };
		let highs = { red: 0, green: 0, blue: 0, alpha: 0 };
		
		for (let idx = 0; idx < 256; idx++) {
			if (histo.red[idx] > 0) highs.red = idx;
			if (histo.green[idx] > 0) highs.green = idx;
			if (histo.blue[idx] > 0) highs.blue = idx;
			if (histo.alpha[idx] > 0) highs.alpha = idx;
		}
		for (let idx = 255; idx >= 0; idx--) {
			if (histo.red[idx] > 0) lows.red = idx;
			if (histo.green[idx] > 0) lows.green = idx;
			if (histo.blue[idx] > 0) lows.blue = idx;
			if (histo.alpha[idx] > 0) lows.alpha = idx;
		}
		
		// create curves
		let channels = opts.channels || 'rgb';
		delete opts.channels;
		
		if (channels.match(/r/i)) opts.red = [];
		if (channels.match(/g/i)) opts.green = [];
		if (channels.match(/b/i)) opts.blue = [];
		if (channels.match(/a/i)) opts.alpha = [];
		
		for (let idx = 0; idx < 256; idx++) {
			if (opts.red) {
				if ((highs.red > lows.red) && (idx >= lows.red) && (idx <= highs.red)) {
					opts.red[idx] = Math.floor( ((idx - lows.red) / (highs.red - lows.red)) * 255 );
				}
				else opts.red[idx] = idx;
			} // red
			
			if (opts.green) {
				if ((highs.green > lows.green) && (idx >= lows.green) && (idx <= highs.green)) {
					opts.green[idx] = Math.floor( ((idx - lows.green) / (highs.green - lows.green)) * 255 );
				}
				else opts.green[idx] = idx;
			} // green
			
			if (opts.blue) {
				if ((highs.blue > lows.blue) && (idx >= lows.blue) && (idx <= highs.blue)) {
					opts.blue[idx] = Math.floor( ((idx - lows.blue) / (highs.blue - lows.blue)) * 255 );
				}
				else opts.blue[idx] = idx;
			} // blue
			
			if (opts.alpha) {
				if ((highs.alpha > lows.alpha) && (idx >= lows.alpha) && (idx <= highs.alpha)) {
					opts.alpha[idx] = Math.floor( ((idx - lows.alpha) / (highs.alpha - lows.alpha)) * 255 );
				}
				else opts.alpha[idx] = idx;
			} // alpha
		}
		
		return this.apply(opts);
	}
	
	/** 
	 * Apply threshold effect using sheer cliff curve at specified level.
	 * @param {(Object|number)} opts - Options for filter or threshold level.
	 * @param {number} [opts.level=128] - The desired threshold level.
	 * @param {string} [opts.channels=rgb] - Which channels to apply filter to.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	threshold(opts = {}) {
		// apply threshold effect using sheer cliff curve at specified level
		// opts: { level, channels }
		if (typeof(opts) == 'number') opts = { level: opts };
		if (!('level' in opts)) opts.level = 128; // default if missing
		
		this.validate(opts, {
			level: { type: 'number', min: 0, max: 255, required: false },
			channels: { type: 'string', match: /^r?g?b?a?$/i, required: false }
		});
		
		let level = Math.floor( opts.level || 0 );
		let curve = [];
		
		for (let idx = 0; idx < 256; idx++) {
			curve.push( (idx < level) ? 0 : 255 );
		}
		
		let channels = opts.channels || 'rgb';
		delete opts.channels;
		delete opts.level;
		
		if (channels.match(/rgb/i)) opts.rgb = curve;
		else {
			if (channels.match(/r/i)) opts.red = curve;
			if (channels.match(/g/i)) opts.green = curve;
			if (channels.match(/b/i)) opts.blue = curve;
		}
		if (channels.match(/a/i)) opts.alpha = curve;
		
		return this.apply(opts);
	}
	
	/** 
	 * Apply lighting functions (shadows, highlights).
	 * @param {Object} opts - Options for filter.
	 * @param {number} [opts.shadows=0] - Enhance shadow detail.
	 * @param {number} [opts.highlights=0] - Enhance highlight detail.
	 * @param {string} [opts.channels=rgb] - Which channels to apply filter to.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	lighting(opts = {}) {
		// apply lighting functions, e.g. shadows, highlights
		// opts: { shadows, highlights, channels }
		let curve = [ [0,0], [63,63], [191,191], [255,255] ];
		
		this.validate(opts, {
			shadows: { type: 'number', min: -100, max: 100, required: false },
			highlights: { type: 'number', min: -100, max: 100, required: false },
			channels: { type: 'string', match: /^r?g?b?a?$/i, required: false }
		});
		
		// shadows
		if (opts.shadows) {
			curve[1][1] += opts.shadows;
		}
		
		// highlights
		if (opts.highlights) {
			curve[2][1] += opts.highlights;
		}
		
		for (let idx = 0, len = curve.length; idx < len; idx++) {
			curve[idx][1] = Math.max(0, Math.min(255, curve[idx][1]) );
		}
		
		let channels = opts.channels || 'rgb';
		delete opts.channels;
		
		if (channels.match(/rgb/i)) opts.rgb = curve;
		else {
			if (channels.match(/r/i)) opts.red = curve;
			if (channels.match(/g/i)) opts.green = curve;
			if (channels.match(/b/i)) opts.blue = curve;
		}
		if (channels.match(/a/i)) opts.alpha = curve;
		
		return this.apply(opts);
	}
	
	/** 
	 * Apply midtone lighting adjustment.
	 * @param {(Object|number)} opts - Options for filter or adjustment value.
	 * @param {number} [opts.amount=0] - Increase or decrease midtone brightness.
	 * @param {string} [opts.channels=rgb] - Which channels to apply filter to.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	midtones(opts = {}) {
		// apply midtone lighting adjustment
		// opts: { amount, channels }
		if (typeof(opts) == 'number') opts = { amount: opts };
		
		this.validate(opts, {
			amount: { type: 'number', min: -100, max: 100, required: false },
			channels: { type: 'string', match: /^r?g?b?a?$/i, required: false }
		});
		
		let curve = [ [0,0], [127,127], [255,255] ];
		
		// midtones
		curve[1][1] += opts.amount || 0;
		
		for (let idx = 0, len = curve.length; idx < len; idx++) {
			curve[idx][1] = Math.max(0, Math.min(255, curve[idx][1]) );
		}
		
		let channels = opts.channels || 'rgb';
		delete opts.channels;
		
		if (channels.match(/rgb/i)) opts.rgb = curve;
		else {
			if (channels.match(/r/i)) opts.red = curve;
			if (channels.match(/g/i)) opts.green = curve;
			if (channels.match(/b/i)) opts.blue = curve;
		}
		if (channels.match(/a/i)) opts.alpha = curve;
		
		return this.apply(opts);
	}
	
	/** 
	 * Apply exposure adjustment (simulating camera exposure).
	 * @param {(Object|number)} opts - Options for filter or exposure amount.
	 * @param {number} [opts.amount=0] - Increase or decrease camera exposure.
	 * @param {string} [opts.channels=rgb] - Which channels to apply filter to.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	exposure(opts = {}) {
		// apply exposure adjustment (simulating camera exposure)
		// opts: { amount, channels }
		if (typeof(opts) == 'number') opts = { amount: opts };
		
		this.validate(opts, {
			amount: { type: 'number', min: -100, max: 100, required: false },
			channels: { type: 'string', match: /^r?g?b?a?$/i, required: false }
		});
		
		let curve = [ 0, 63, 127, 191, 255 ];
		
		// exposure
		if (opts.amount) {
			if (opts.amount > 0) {
				curve[1] += (opts.amount * 2);
				curve[2] += (opts.amount * 3);
				curve[3] += (opts.amount * 4);
			}
			else {
				opts.amount /= 2;
				curve[4] += (opts.amount * 5);
				curve[3] += (opts.amount * 4);
				curve[2] += (opts.amount * 3);
				curve[1] += (opts.amount * 2);
			}
		}
		
		for (let idx = 0, len = curve.length; idx < len; idx++) {
			curve[idx] = Math.max(0, Math.min(255, curve[idx]) );
		}
		
		let channels = opts.channels || 'rgb';
		delete opts.channels;
		
		if (channels.match(/rgb/i)) opts.rgb = curve;
		else {
			if (channels.match(/r/i)) opts.red = curve;
			if (channels.match(/g/i)) opts.green = curve;
			if (channels.match(/b/i)) opts.blue = curve;
		}
		if (channels.match(/a/i)) opts.alpha = curve;
		
		return this.apply(opts);
	}
	
	/** 
	 * Apply brightness adjustment across image.
	 * @param {(Object|number)} opts - Options for filter or brightness amount.
	 * @param {number} [opts.amount=0] - Increase or decrease image brightness.
	 * @param {string} [opts.channels=rgb] - Which channels to apply filter to.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	brightness(opts = {}) {
		// apply brightness adjustment
		if (typeof(opts) == 'number') opts = { amount: opts };
		
		this.validate(opts, {
			amount: { type: 'number', min: -255, max: 255, required: false },
			channels: { type: 'string', match: /^r?g?b?a?$/i, required: false }
		});
		
		let curve = [ [0,0], [255,255] ];
		
		if (opts.amount > 0) {
			// increase brightness
			curve[0][1] += opts.amount;
		}
		else {
			// decrease brightness
			curve[1][1] += opts.amount;
		}
		
		for (let idx = 0, len = curve.length; idx < len; idx++) {
			curve[idx][1] = Math.max(0, Math.min(255, curve[idx][1]) );
		}
		
		let channels = opts.channels || 'rgb';
		delete opts.channels;
		
		if (channels.match(/rgb/i)) opts.rgb = curve;
		else {
			if (channels.match(/r/i)) opts.red = curve;
			if (channels.match(/g/i)) opts.green = curve;
			if (channels.match(/b/i)) opts.blue = curve;
		}
		if (channels.match(/a/i)) opts.alpha = curve;
		
		return this.apply(opts);
	}
	
	/** 
	 * Apply contrast adjustment across image.
	 * @param {(Object|number)} opts - Options for filter or contrast amount.
	 * @param {number} [opts.amount=0] - Increase or decrease image contrast.
	 * @param {string} [opts.channels=rgb] - Which channels to apply filter to.
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	contrast(opts = {}) {
		// apply contrast adjustment
		if (typeof(opts) == 'number') opts = { amount: opts };
		
		this.validate(opts, {
			amount: { type: 'number', min: -255, max: 255, required: false },
			channels: { type: 'string', match: /^r?g?b?a?$/i, required: false }
		});
		
		let curve = [ [0,0], [255,255] ];
		opts.amount = Math.floor( opts.amount / 2 );
		
		if (opts.amount > 0) {
			// increase contrast
			curve = [ [0,0], [opts.amount, 0], [255 - opts.amount, 255], [255,255] ];
			opts.algo = 'linear';
		}
		else {
			// decrease contrast
			curve[0][1] -= opts.amount;
			curve[1][1] += opts.amount;
		}
		
		for (let idx = 0, len = curve.length; idx < len; idx++) {
			curve[idx][1] = Math.max(0, Math.min(255, curve[idx][1]) );
		}
		
		let channels = opts.channels || 'rgb';
		delete opts.channels;
		
		if (channels.match(/rgb/i)) opts.rgb = curve;
		else {
			if (channels.match(/r/i)) opts.red = curve;
			if (channels.match(/g/i)) opts.green = curve;
			if (channels.match(/b/i)) opts.blue = curve;
		}
		if (channels.match(/a/i)) opts.alpha = curve;
		
		return this.apply(opts);
	}
	
	//
	// Utility Methods:
	//
	
	/** 
	 * Desaturate entire canvas image (convert to grayscale).
	 * @returns {this} - The curve instance, for chaining calls.
	 */
	desaturate() {
		// desaturate image to grayscale
		let width = this.width;
		let height = this.height;
		let imgData = this.context.getImageData(0, 0, width, height);
		let offset = 0;
		let brightness = 0;
		
		for (let y = 0; y < height; y++) {
			// foreach row
			for (let x = 0; x < width; x++) {
				// for each pixel
				if (imgData.data[ offset + 3 ] > 0) {
					// calculate brightness fast
					brightness = 0.2126 * imgData.data[ offset + 0 ] + 0.7152 * imgData.data[ offset + 1 ] + 0.0722 * imgData.data[ offset + 2 ];
					
					imgData.data[ offset + 0 ] = brightness;
					imgData.data[ offset + 1 ] = brightness;
					imgData.data[ offset + 2 ] = brightness;
				}
				offset += 4;
			} // x loop
		} // y loop
		
		this.context.putImageData( imgData, 0, 0 );
		return this;
	}
	
	/** 
	 * Generate image histogram
	 * @returns {Object} - The hisogram data.
	 */
	histogram() {
		// generate histogram data
		let width = this.width;
		let height = this.height;
		let imgData = this.context.getImageData(0, 0, width, height);
		let data = imgData.data;
		let offset = 0;
		let histo = { red: [], green: [], blue: [], alpha: [] };
		
		for (let idx = 0; idx < 256; idx++) {
			histo.red.push(0);
			histo.green.push(0);
			histo.blue.push(0);
			histo.alpha.push(0);
		}
		
		for (let y = 0; y < height; y++) {
			// foreach row
			for (let x = 0; x < width; x++) {
				// for each pixel
				if (data[ offset + 3 ]) {
					histo.red[ data[ offset + 0 ] ]++;
					histo.green[ data[ offset + 1 ] ]++;
					histo.blue[ data[ offset + 2 ] ]++;
					histo.alpha[ data[ offset + 3 ] ]++;
				}
				offset += 4;
			} // x loop
		} // y loop
		
		// calc maximums
		histo.redMax = Math.max.apply(null, histo.red);
		histo.greenMax = Math.max.apply(null, histo.green);
		histo.blueMax = Math.max.apply(null, histo.blue);
		histo.alphaMax = Math.max.apply(null, histo.alpha);
		
		return histo;
	}
	
	/** 
	 * Generate curve array given set of points.
	 * @protected
	 * @param {number[]} points - Array of points.
	 * @param {string} [algo] - Override interpolation scheme, e.g. 'linear'.
	 * @returns {number[]} - Rendered curve array.
	 */
	generateCurve(points, algo) {
		// Generate curve from points using monotone cubic interpolation.
		// This is somewhat like Adobe Photoshop's 'Curves' filter.
		// Result will be a 1-D array of exactly 256 elements (Y values).
		let xs = [];
		let ys = [];
		let x, y;
		
		// points must have at least two elements
		if (points.length < 2) points = [ [0,0], [255,255] ];
		
		// simple 1D array of Y values = spread X values evenly across full range
		if (typeof(points[0]) == 'number') {
			
			// special case: if user has supplied 256 Y values, well, that's the whole curve
			if (points.length == 256) return points;
			
			// create X/Y pairs
			let new_points = [];
			for (let idx = 0, len = points.length; idx < len; idx++) {
				y = points[idx];
				x = Math.floor( (idx / (len - 1) ) * 255 );
				new_points.push( [ x, y ] );
			}
			points = new_points;
		}
		
		// first point must be at X = 0
		points[0][0] = 0;
		
		// last point must be at X = 255
		points[ points.length - 1 ][0] = 255;
		
		// convert to arrays of axis, for createInterpolant()
		points.forEach( function(pt) {
			xs.push( Math.floor( Math.max(0, Math.min(255, pt[0]))) );
			ys.push( Math.floor( Math.max(0, Math.min(255, pt[1]))) );
		} );
		
		// generate monotonal cubic interpolator function
		let func = (algo === 'linear') ? this.createLinear(points) : this.createInterpolant(xs, ys);
		let curve = [];
		
		// apply curve to 255 points along X axis
		for (x = 0; x < 256; x++) {
			y = func(x);
			curve.push( Math.floor(y) );
		}
		
		// return Y values
		return curve;
	}
	
	/** 
	 * Generate lunear interpolation function on a 2D array.
	 * @private
	 * @param {number[]} points - Array of points.
	 * @returns {function} The interpolant function.
	 */
	createLinear(points) {
		// create cache of x values pointing to starting point for each leg
		var xs = [];
		
		for (let idx = 1, len = points.length; idx < len; idx++) {
			let prev_point = points[idx - 1];
			let cur_point = points[idx];
			
			for (let x = prev_point[0], xmax = cur_point[0]; x < xmax; x++) {
				xs[x] = idx - 1;
			}
		}
		
		// Return interpolant function
		return function(x) {
			if (x === 255) return points[ points.length - 1][1];
			
			// find starting point and lerp to next point
			let start_point = points[ xs[x] ];
			let end_point = points[ xs[x] + 1 ];
			let start_x = start_point[0];
			let end_x = end_point[0];
			let x_dist = end_x - start_x;
			let start_y = start_point[1];
			let end_y = end_point[1];
			let y_dist = end_y - start_y;
			
			if (!x_dist || !y_dist) return start_y;
			
			let x_value = x - start_x;
			let y_value = Math.floor( start_y + (y_dist * (x_value / x_dist)) );
			return y_value;
		};
	}
	
	/** 
	 * Generate monotone cubic interpolation function on a 2D array.
	 * @private
	 * @param {number[]} xs - Array of X axis points.
	 * @param {number[]} ys - Array of Y axis points.
	 * @returns {function} The interpolant function.
	 */
	createInterpolant(xs, ys) {
		let i, length = xs.length;
		
		// Deal with length issues
		if (length != ys.length) { throw 'Need an equal count of xs and ys.'; }
		if (length === 0) { return function(x) { return 0; }; }
		if (length === 1) {
			// Impl: Precomputing the result prevents problems if ys is mutated later and allows garbage collection of ys
			// Impl: Unary plus properly converts values to numbers
			let result = +ys[0];
			return function(x) { return result; };
		}
		
		// Rearrange xs and ys so that xs is sorted
		let indexes = [];
		for (i = 0; i < length; i++) { indexes.push(i); }
		indexes.sort(function(a, b) { return xs[a] < xs[b] ? -1 : 1; });
		let oldXs = xs, oldYs = ys;
		// Impl: Creating new arrays also prevents problems if the input arrays are mutated later
		xs = []; ys = [];
		// Impl: Unary plus properly converts values to numbers
		for (i = 0; i < length; i++) { xs.push(+oldXs[indexes[i]]); ys.push(+oldYs[indexes[i]]); }
		
		// Get consecutive differences and slopes
		let dys = [], dxs = [], ms = [];
		for (i = 0; i < length - 1; i++) {
			let dx = xs[i + 1] - xs[i], dy = ys[i + 1] - ys[i];
			dxs.push(dx); dys.push(dy); ms.push(dy/dx);
		}
		
		// Get degree-1 coefficients
		let c1s = [ms[0]];
		for (i = 0; i < dxs.length - 1; i++) {
			let m = ms[i], mNext = ms[i + 1];
			if (m*mNext <= 0) {
				c1s.push(0);
			} else {
				let dx_ = dxs[i], dxNext = dxs[i + 1], common = dx_ + dxNext;
				c1s.push(3*common/((common + dxNext)/m + (common + dx_)/mNext));
			}
		}
		c1s.push(ms[ms.length - 1]);
		
		// Get degree-2 and degree-3 coefficients
		let c2s = [], c3s = [];
		for (i = 0; i < c1s.length - 1; i++) {
			let c1 = c1s[i], m_ = ms[i], invDx = 1/dxs[i], common_ = c1 + c1s[i + 1] - m_ - m_;
			c2s.push((m_ - c1 - common_)*invDx); c3s.push(common_*invDx*invDx);
		}
		
		// Return interpolant function
		return function(x) {
			// The rightmost point in the dataset should give an exact result
			let i = xs.length - 1;
			if (x == xs[i]) { return ys[i]; }
			
			// Search for the interval x is in, returning the corresponding y if x is one of the original xs
			let low = 0, mid, high = c3s.length - 1;
			while (low <= high) {
				mid = Math.floor(0.5*(low + high));
				let xHere = xs[mid];
				if (xHere < x) { low = mid + 1; }
				else if (xHere > x) { high = mid - 1; }
				else { return ys[mid]; }
			}
			i = Math.max(0, high);
			
			// Interpolate
			let diff = x - xs[i], diffSq = diff*diff;
			return ys[i] + c1s[i]*diff + c2s[i]*diffSq + c3s[i]*diff*diffSq;
		};
	}
	
	/** 
	 * Validate options based on a set of rules
	 * @private
	 * @param {object} opts - The options object to validate.
	 * @param {object} rules - The set of rules to apply.
	 * @returns {boolean} True if valid, throws otherwise.
	 */
	validate(opts, rules) {
		// validate opts based on rules
		Object.keys(rules).forEach( function(key) {
			let rule = rules[key];
			
			if (!(key in opts)) {
				if (rule.required) throw new Error("Missing required property: " + key);
				else return; // skip to next (not required)
			}
			
			if (rule.type) {
				if (typeof(opts[key]) !== rule.type) throw new Error("Property '" + key + "' must be type: " + rule.type);
			}
			
			if (rule.type == 'number') {
				if (('min' in rule) && (opts[key] < rule.min)) opts[key] = rule.min;
				if (('max' in rule) && (opts[key] > rule.max)) opts[key] = rule.max;
			}
			else if (rule.type == 'string') {
				if (rule.match && !opts[key].match(rule.match)) throw new Error("Property '" + key + "' must match pattern: " + rule.match);
			}
		} ); // foreach rule
		
		return true;
	}
	
} // class

class CurveEditor {
	
	constructor(div, parent) {
		this.div = div;
		this.parent = parent;
		
		this.params = {
			points: [0, 127, 255],
			channels: 'rgb'
		};
	}
	
	init() {
		// setup DOM
		this.div.empty().append(
			'<div class="curve_title">' +
				'<span>Curve Editor</span>' + 
				'<i class="curve_filter_icon mdi mdi-plus-circle"></i>' + 
				'<i class="curve_filter_icon mdi mdi-minus-circle">&nbsp;</i>' +
			'</div>'
		);
		
		var canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 256;
		canvas.style.width = '100%';
		canvas.style.height = 'auto';
		canvas.style.marginTop = '8px';
		this.div.append(canvas);
		
		this.updateCurvePreview();
		
		// setup mouse handling on curve editor
		this.div.find('canvas').off()
			.on('mousedown', this.previewMouseDown.bind(this))
			.on('mousemove', this.previewMouseMove.bind(this))
			.on('mouseout', this.previewMouseOut.bind(this));
		
		this.div.find('i.mdi-plus-circle').off().on('click', this.addCurvePoint.bind(this));
		this.div.find('i.mdi-minus-circle').off().on('click', this.removeCurvePoint.bind(this));
	}
	
	updateCurvePreview() {
		// draw preview of curve into canvas
		var c = this.div.find('canvas').get(0);
		var ctx = c.getContext('2d');
		var values = this.parent.curve.curve.red;
		var width = c.width;
		var height = c.height;
		
		ctx.clearRect(0, 0, width, height);
		
		// grid lines
		ctx.save();
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
		ctx.setLineDash( [6, 3] );
		
		// horizontal lines
		[0.25, 0.5, 0.75].forEach( function(value) {
			ctx.beginPath();
			ctx.moveTo( 0, value * height );
			ctx.lineTo( width, value * height );
			ctx.stroke();
		} );
		
		// vertical lines
		[0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].forEach( function(value) {
			ctx.beginPath();
			ctx.moveTo( value * width, 0 );
			ctx.lineTo( value * width, height );
			ctx.stroke();
		} );
		
		ctx.restore();
		
		// now draw the curve shape itself
		var xmax = width - 1;
		var ymax = height - 1;
		
		ctx.save();
		ctx.lineWidth = 2;
		ctx.lineJoin = 'round';
		ctx.lineCap = "butt";
		
		ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
		
		ctx.beginPath();
		ctx.moveTo( 0, ymax );
		
		for (var idx = 0; idx < 256; idx++) {
			var x = (idx / 255) * xmax;
			var y = ymax - ((values[idx] / 255) * ymax);
			ctx.lineTo( x, y );
		}
		
		ctx.lineTo( xmax, ymax );
		ctx.lineTo( 0, ymax );
		ctx.fill();
		ctx.stroke();
		ctx.restore();
		
		// now draw control dots on all the key points
		ctx.save();
		ctx.lineWidth = 1;
		ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
		
		for (var idx = 0, len = this.params.points.length; idx < len; idx++) {
			var value = this.params.points[idx];
			var x = (idx / (len - 1)) * xmax;
			var y = ymax - ((value / 255) * ymax);
			
			if (this.dragging && (this.dragging.pointIdx == idx)) ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
			else if (this.hovering && (this.hovering.pointIdx == idx)) ctx.fillStyle = '#3f7ed5';
			else ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
			
			ctx.beginPath(); 
			ctx.arc(x, y, 9, 0, Math.PI * 2, true);
			ctx.fill();
			ctx.stroke();
		};
		
		ctx.restore();
	}
	
	previewMouseMove(event) {
		// process canvas hover event (before drag start)
		// this just handles the control point hover highlight
		if (this.dragging) return;
		
		var $c = this.div.find('canvas');
		var c = $c.get(0);
		
		var width = c.width;
		var height = c.height;
		
		var px = event.offsetX * (width / $c.width());
		var py = event.offsetY * (height / $c.height());
		
		var xmax = width - 1;
		var ymax = height - 1;
		
		var hover = null;
		
		for (var idx = 0, len = this.params.points.length; idx < len; idx++) {
			var value = this.params.points[idx];
			var x = (idx / (len - 1)) * xmax;
			var y = ymax - ((value / 255) * ymax);
			
			if ((Math.abs(x - px) <= 16) && (Math.abs(y - py) <= 16)) {
				hover = { pointIdx: idx };
				idx = len;
			}
		}
		
		if (hover && !this.hovering) {
			// hover start
			this.hovering = hover;
			this.updateCurvePreview();
		}
		else if (!hover && this.hovering) {
			// hover stop
			delete this.hovering;
			this.updateCurvePreview();
		}
		else if (hover && this.hovering && (hover.pointIdx != this.hovering.pointIdx)) {
			// jump to diff point
			this.hovering = hover;
			this.updateCurvePreview();
		}
	}
	
	previewMouseOut(event) {
		// mouse has left canvas, cancel hover if active
		if (this.hovering) {
			delete this.hovering;
			this.updateCurvePreview();
		}
	}
	
	previewMouseDown(event) {
		// see if user clicked on a control point
		event.preventDefault();
		
		var $c = this.div.find('canvas');
		var c = $c.get(0);
		
		var width = c.width;
		var height = c.height;
		
		var px = event.offsetX * (width / $c.width());
		var py = event.offsetY * (height / $c.height());
		
		var xmax = width - 1;
		var ymax = height - 1;
		
		for (var idx = 0, len = this.params.points.length; idx < len; idx++) {
			var value = this.params.points[idx];
			var x = (idx / (len - 1)) * xmax;
			var y = ymax - ((value / 255) * ymax);
			
			if ((Math.abs(x - px) <= 16) && (Math.abs(y - py) <= 16)) {
				this.dragging = {
					pointIdx: idx,
					startValue: value,
					startY: event.clientY * (height / $c.height()),
					canvasHeight: height,
					domHeight: $c.height()
				};
				this.updateCurvePreview();
				
				// inform app we want drag and release events
				app.mouseHandler = this;
				
				idx = len;
			}
		}
	}
	
	mouseMove(event) {
		// move moved after clicking on a control point
		// called from app.mouseHandler
		if (this.dragging) {
			var drag = this.dragging;
			var py = event.clientY * (drag.canvasHeight / drag.domHeight);
			var delta = 0 - Math.floor( py - drag.startY );
			var value = drag.startValue + delta;
			
			this.params.points[ drag.pointIdx ] = Math.clamp( value, 0, 255 );
			
			// this.updateCurvePreview();
			this.parent.update();
		}
	}
	
	mouseUp(event) {
		// mouse released from canvas
		// called from app.mouseHandler
		event.preventDefault();
		
		if (this.dragging) {
			delete this.dragging;
			this.rebuildCurve();
		}
	}
	
	rebuildCurve(len) {
		// rebuild curve with new point count
		if (!len) len = this.params.points.length;
		var values = this.parent.curve.generateCurve( this.params.points );
		var points = [];
		
		for (var idx = 0; idx < len; idx++) {
			var idy = Math.floor( idx * (255 / (len - 1)) );
			points.push( values[idy] );
		}
		
		this.params.points = points;
		this.parent.update();
	}
	
	addCurvePoint() {
		// add curve point and rebuild curve to fit
		if (this.params.points.length < 32) this.rebuildCurve( this.params.points.length + 1 );
	}
	
	removeCurvePoint() {
		// remove curve point and rebuild curve to fit
		if (this.params.points.length > 2) this.rebuildCurve( this.params.points.length - 1 );
	}
	
	update() {
		// apply points to parent curve, called by parent
		this.parent.curve.apply({ rgb: this.params.points });
		this.updateCurvePreview();
	}
	
} // CurveEditor

class CurvePreview {
	
	constructor(div, parent) {
		this.div = div;
		this.parent = parent;
	}
	
	init() {
		// setup DOM
		this.div.empty().append('<div class="curve_title">Computed Curve</div>');
		
		var canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 256;
		canvas.style.width = '100%';
		canvas.style.height = 'auto';
		canvas.style.marginTop = '8px';
		
		this.div.append(canvas);
	}
	
	update() {
		// render curve preview
		var pcanvas = this.div.find('canvas').get(0);
		this.renderCurvePreviewBackground(pcanvas);
		this.renderCurvePreviewChannel(pcanvas, 'red', 255);
		this.renderCurvePreviewChannel(pcanvas, 'green', 255);
		this.renderCurvePreviewChannel(pcanvas, 'blue', 255);
	}
	
	renderCurvePreviewBackground(c) {
		// grid lines
		var width = c.width;
		var height = c.height;
		var ctx = c.getContext('2d');
		ctx.clearRect( 0, 0, width, height );
		
		ctx.save();
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
		ctx.setLineDash( [6, 3] );
		
		// horizontal lines
		[0.25, 0.5, 0.75].forEach( function(value) {
			ctx.beginPath();
			ctx.moveTo( 0, value * height );
			ctx.lineTo( width, value * height );
			ctx.stroke();
		} );
		
		// vertical lines
		[0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].forEach( function(value) {
			ctx.beginPath();
			ctx.moveTo( value * width, 0 );
			ctx.lineTo( value * width, height );
			ctx.stroke();
		} );
		
		ctx.restore();
	}
	
	renderCurvePreviewChannel(c, chan, max) {
		// render single histogram channel
		var curveData = this.parent.curve.curve;
		var ctx = c.getContext('2d');
		var width = c.width;
		var height = c.height;
		var xmax = width - 1;
		var ymax = height - 1;
		var values = curveData[chan];
		var rgb = (chan == 'red') ? '255, 0, 0' : ((chan == 'green') ? '0, 255, 0' : '0, 0, 255');
		
		// now the curve itself
		ctx.save();
		ctx.lineWidth = 2;
		ctx.lineJoin = 'round';
		ctx.lineCap = "butt";
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = 'rgba(' + rgb + ', 0.4)';
		ctx.strokeStyle = 'rgba(' + rgb + ', 0.65)';
		
		ctx.beginPath();
		ctx.moveTo( 0, ymax );
		
		for (var idx = 0; idx < 256; idx++) {
			var x = (idx / 255) * xmax;
			var y = ymax - ((values[idx] / max) * ymax);
			ctx.lineTo( x, y );
		}
		
		ctx.lineTo( xmax, ymax );
		ctx.lineTo( 0, ymax );
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}
	
} // CurvePreview

class CurveDemo extends BlogPlugin {
	
	constructor(elem) {
		// expects data: plugin, filters, image
		super();
		this.elem = elem;
		this.data = elem.data();
		elem.addClass('curves');
	}
	
	render() {
		// called when our component scrolls into view for the first time
		this.elem.addClass('loading');
		this.image = new Image();
		this.image.onload = this.setup.bind(this);
		this.image.src = this.data.image;
	}
	
	setup() {
		// image is loaded, create canvas
		var self = this;
		var image = this.image;
		
		this.elem.removeClass('loading');
		
		var canvas = this.canvas = document.createElement('canvas');
		canvas.width = image.width;
		canvas.height = image.height;
		canvas.style.width = '100%';
		canvas.style.height = '100%';
		this.elem.append(canvas);
		
		// var context = this.context = canvas.getContext('2d');
		// context.drawImage( image, 0, 0 );
		
		this.curve = new Curve(canvas);
		
		var $cont = $('<div></div>');
		$cont.addClass('curve_filter_container');
		this.elem.append($cont);
		
		this.filters = this.data.filters.split(/\,\s*/);
		this.filters.forEach( function(fname) {
			var $filter = $('<div></div>').addClass('curve_filter').data({
				fname: fname,
				enabled: true,
				red: true,
				green: true,
				blue: true
			});
			$filter.append(
				'<div class="curve_title">' +
					'<i class="curve_filter_toggle mdi mdi-checkbox-marked">&nbsp;</i>' + 
					'<span></span>' + 
					'<i class="curve_filter_rgb_toggle blue mdi mdi-checkbox-marked-circle"></i>' + 
					'<i class="curve_filter_rgb_toggle green mdi mdi-checkbox-marked-circle">&nbsp;</i>' + 
					'<i class="curve_filter_rgb_toggle red mdi mdi-checkbox-marked-circle">&nbsp;</i>' + 
				'</div>'
			);
			$cont.append($filter);
			
			switch (fname) {
				
				case 'brightness':
					$filter.append('<div class="curve_component"><input type="range" min="-255" max="255" step="1" value="0"></div>');
					$filter.addClass('rgb'); // show rgb checkboxes
				break;
				
				case 'contrast':
					$filter.append('<div class="curve_component"><input type="range" min="-255" max="255" step="1" value="0"></div>');
					$filter.addClass('rgb'); // show rgb checkboxes
				break;
				
				case 'posterize':
					$filter.append('<div class="curve_component"><input type="range" min="1" max="32" step="1" value="8"></div>');
					$filter.addClass('rgb'); // show rgb checkboxes
				break;
				
				case 'solarize':
					$filter.addClass('rgb'); // show rgb checkboxes
				break;
				
				case 'invert':
					$filter.addClass('rgb'); // show rgb checkboxes
				break;
				
				case 'temperature':
					$filter.append('<div class="curve_component"><input type="range" min="-255" max="255" step="1" value="0"></div>');
				break;
				
				case 'gamma':
					$filter.append('<div class="curve_component"><input type="range" min="0.25" max="4" step="0.01" value="1"></div>');
					$filter.addClass('rgb'); // show rgb checkboxes
				break;
				
				case 'sepia':
					// no options
				break;
				
				case 'normalize':
					$filter.addClass('rgb'); // show rgb checkboxes
				break;
				
				case 'threshold':
					$filter.append('<div class="curve_component"><input type="range" min="0" max="255" step="1" value="128"></div>');
					$filter.addClass('rgb'); // show rgb checkboxes
				break;
				
				case 'shadows':
					$filter.append('<div class="curve_component"><input type="range" min="-100" max="100" step="1" value="0"></div>');
					$filter.addClass('rgb'); // show rgb checkboxes
				break;
				
				case 'highlights':
					$filter.append('<div class="curve_component"><input type="range" min="-100" max="100" step="1" value="0"></div>');
					$filter.addClass('rgb'); // show rgb checkboxes
				break;
				
				case 'midtones':
					$filter.append('<div class="curve_component"><input type="range" min="-100" max="100" step="1" value="0"></div>');
					$filter.addClass('rgb'); // show rgb checkboxes
				break;
				
				case 'exposure':
					$filter.append('<div class="curve_component"><input type="range" min="-100" max="100" step="1" value="0"></div>');
					$filter.addClass('rgb'); // show rgb checkboxes
				break;
				
				case 'preview':
					// non-editable curve preview
					self.preview = new CurvePreview($filter, self);
					self.preview.init();
				break;
				
				case 'editor':
					// curve editor, from canvas-plus-platground
					self.editor = new CurveEditor($filter, self);
					self.editor.init();
				break;
				
			} // switch fname
		} ); // foreach filter
		
		$cont.find('input').on('input change', this.update.bind(this));
		$cont.find('i.curve_filter_toggle').on('click', function() { self.toggleFilter(this); });
		$cont.find('i.curve_filter_rgb_toggle').on('click', function() { self.toggleFilterRGB(this); });
		this.update();
	}
	
	update() {
		// update from DOM, run all filters, regenerate image
		var self = this;
		var canvas = this.canvas;
		var context = canvas.getContext('2d');
		var image = this.image;
		var curve = this.curve;
		
		curve.reset();
		
		this.elem.find('.curve_filter').each( function() {
			var $filter = $(this);
			var fname = $filter.data('fname');
			if (!$filter.data('enabled')) return;
			
			var channels = '';
			if ($filter.data('red')) channels += 'r';
			if ($filter.data('green')) channels += 'g';
			if ($filter.data('blue')) channels += 'b';
			if (!channels) return;
			
			switch (fname) {
				
				case 'brightness':
					var value = parseInt( $filter.find('input').val() );
					curve.brightness({ amount: value, channels });
					$filter.find('.curve_title > span').html( 'Brightness: ' + ((value > 0) ? '+' : '') + value );
				break;
				
				case 'contrast':
					var value = parseInt( $filter.find('input').val() );
					curve.contrast({ amount: value, channels });
					$filter.find('.curve_title > span').html( 'Contrast: ' + ((value > 0) ? '+' : '') + value );
				break;
				
				case 'posterize':
					var value = parseInt( $filter.find('input').val() );
					curve.posterize({ levels: value, channels });
					$filter.find('.curve_title > span').html( 'Posterize: ' + value + ' Level' + ((value != 1) ? 's' : '') );
				break;
				
				case 'solarize':
					curve.solarize({ channels });
					$filter.find('.curve_title > span').html( 'Solarize' );
				break;
				
				case 'invert':
					curve.invert({ channels });
					$filter.find('.curve_title > span').html( 'Invert' );
				break;
				
				case 'temperature':
					var value = parseInt( $filter.find('input').val() );
					curve.temperature({ amount: value });
					$filter.find('.curve_title > span').html( 'Color Temperature: ' + ((value > 0) ? '+' : '') + value );
				break;
				
				case 'gamma':
					var value = parseFloat( $filter.find('input').val() );
					curve.gamma({ amount: value, channels });
					$filter.find('.curve_title > span').html( 'Gamma: ' + value );
				break;
				
				case 'sepia':
					curve.desaturate().sepia();
					$filter.find('.curve_title > span').html( 'Sepia Tone' );
				break;
				
				case 'normalize':
					curve.normalize({ channels });
					$filter.find('.curve_title > span').html( 'Normalize' );
				break;
				
				case 'threshold':
					var value = parseInt( $filter.find('input').val() );
					curve.threshold({ level: value, channels });
					$filter.find('.curve_title > span').html( 'Threshold: ' + value );
				break;
				
				case 'shadows':
					var value = parseInt( $filter.find('input').val() );
					curve.lighting({ shadows: value, channels });
					$filter.find('.curve_title > span').html( 'Shadows: ' + ((value > 0) ? '+' : '') + value );
				break;
				
				case 'highlights':
					var value = parseInt( $filter.find('input').val() );
					curve.lighting({ highlights: value, channels });
					$filter.find('.curve_title > span').html( 'Highlights: ' + ((value > 0) ? '+' : '') + value );
				break;
				
				case 'midtones':
					var value = parseInt( $filter.find('input').val() );
					curve.midtones({ amount: value, channels });
					$filter.find('.curve_title > span').html( 'Midtones: ' + ((value > 0) ? '+' : '') + value );
				break;
				
				case 'exposure':
					var value = parseInt( $filter.find('input').val() );
					curve.exposure({ amount: value, channels });
					$filter.find('.curve_title > span').html( 'Exposure: ' + ((value > 0) ? '+' : '') + value );
				break;
				
				case 'preview':
					self.preview.update();
				break;
				
				case 'editor':
					self.editor.update();
				break;
				
			} // switch fname
		}); // foreach filter
		
		context.clearRect( 0, 0, canvas.width, canvas.height );
		context.drawImage( image, 0, 0 );
		curve.render();
	}
	
	toggleFilter(button) {
		// toggle filter enabled/disabled
		var $button = $(button);
		var $filter = $button.closest('.curve_filter');
		
		if ($button.hasClass('mdi-checkbox-marked')) {
			$button.removeClass('mdi-checkbox-marked').addClass('mdi-checkbox-blank-outline');
			$filter.data('enabled', false);
			$filter.addClass('disabled');
		}
		else {
			$button.removeClass('mdi-checkbox-blank-outline').addClass('mdi-checkbox-marked');
			$filter.data('enabled', true);
			$filter.removeClass('disabled');
		}
		
		this.update();
	}
	
	toggleFilterRGB(button) {
		// toggle filter RGB channel controls
		var $button = $(button);
		var $filter = $button.closest('.curve_filter');
		var channel = $button.hasClass('red') ? 'red' : ($button.hasClass('green') ? 'green' : 'blue');
		
		if ($button.hasClass('mdi-checkbox-marked-circle')) {
			$button.removeClass('mdi-checkbox-marked-circle').addClass('mdi-checkbox-blank-circle-outline');
			$filter.data(channel, false);
		}
		else {
			$button.removeClass('mdi-checkbox-blank-circle-outline').addClass('mdi-checkbox-marked-circle');
			$filter.data(channel, true);
		}
		
		this.update();
	}
	
	onResize() {
		
	}
	
} // class

app.addStylesheet(`

	div.plugin.curves {
		position: relative;
		aspect-ratio: 16/9;
	}
	
	div.curve_filter_container {
		position: absolute;
		width: 250px;
		height: 100%;
		left: 0;
		top: 0;
		z-index: 2;
		overflow-y: auto;
	}
	
	div.curve_filter {
		cursor: default;
		margin-top: 12px;
		margin-left: 12px;
		padding: 12px;
		
		backdrop-filter: blur(20px);
  		-webkit-backdrop-filter: blur(20px);
		
		border-radius: 10px;
		
		/* background-color: rgba(255, 255, 255, 0.25); */
		background-color: rgba(0, 0, 0, 0.25);
		
		box-shadow: -1px -1px 1px rgba(255, 255, 255, 0.4), 1px 1px 1px rgba(0, 0, 0, 0.4);
	}
	
	div.curve_filter.disabled {
		filter: grayscale(100%);
		opacity: 0.75;
		cursor: default !important;
	}
	div.curve_filter.disabled i.curve_filter_rgb_toggle {
		pointer-events: none;
	}
	div.curve_filter.disabled input {
		pointer-events: none;
	}
	
	div.curve_title {
		font-size: 13px;
		font-weight: bold;
		color: rgba(255, 255, 255, 0.75);
		text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.4);
	}
	
	div.curve_component {
		margin-top: 8px;
	}
	
	i.curve_filter_toggle {
		cursor: pointer;
		user-select: none;
		-webkit-user-select: none;
	}
	i.curve_filter_toggle:hover {
		color: var(--theme-color);
	}
	i.curve_filter_rgb_toggle {
		float: right;
		cursor: pointer;
		user-select: none;
		-webkit-user-select: none;
		display: none;
	}
	div.curve_filter.rgb i.curve_filter_rgb_toggle {
		display: inline;
	}
	i.curve_filter_rgb_toggle.red {
		color: var(--red);
	}
	i.curve_filter_rgb_toggle.red:hover {
		color: var(--red-highlight);
	}
	i.curve_filter_rgb_toggle.green {
		color: var(--green);
	}
	i.curve_filter_rgb_toggle.green:hover {
		color: var(--green-highlight);
	}
	i.curve_filter_rgb_toggle.blue {
		color: var(--blue);
	}
	i.curve_filter_rgb_toggle.blue:hover {
		color: var(--blue-highlight);
	}
	
	i.curve_filter_icon {
		float: right;
		cursor: pointer;
		user-select: none;
		-webkit-user-select: none;
	}
	i.curve_filter_icon:hover {
		color: var(--theme-color);
	}
	
	div.curve_filter input[type=range] {
		width: 100%;
		cursor: drag;
	}
	
	div.curve_filter input[type=range]:focus {
		outline: none;
	}
	div.curve_filter input[type=range]::-webkit-slider-runnable-track {
		cursor: pointer;
	}
	div.curve_filter input[type=range]::-webkit-slider-thumb {
		cursor: -webkit-grab;
		cursor: grab;
	}
	div.curve_filter input[type=range]::-webkit-slider-thumb:active {
		cursor: -webkit-grabbing;
		cursor: grabbing;
	}
	div.curve_filter input[type=range]::-moz-range-track {
		cursor: pointer;
	}
	div.curve_filter input[type=range]::-moz-range-thumb {
		cursor: -webkit-grab;
		cursor: grab;
	}
	div.curve_filter input[type=range]::-moz-range-thumb:active {
		cursor: -webkit-grabbing;
		cursor: grabbing;
	}
	
`);

app.registerBlogPlugin( 'curves', CurveDemo );
