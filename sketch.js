// import "libraries/p5.min.js"
// import "libraries/p5.sound.min.js"
// import {PaintBrush} from "./paintbrush.js";
// import {Paint} from "./paint.js";
// import {Brush} from "./brush.js";

/**
 * Instructions: Attach an Xbox controller and press the play button on the website
 * 
 * Key mapping:
 * 
 * Left stick (LSX,LSY) : Moves the cursor
 * Right stick (RSX,RSY): Changes color (in my_hue & saturation color space)
 * Right trigger (RT): Brush (size varies acc. to how much you press the trigger)
 * Left trigger (LT): Changes brightness
 * Right shoulder (RB): Locks (& unlocks) a set brush size
 * Left shoulder (LB): Locks (& unlocks) a set brightness
 * LS button (LSB): Locks (& unlocks) a set saturation
 * RS button (RSB): resets color to white
 * A button : toggles color randomization (adds a random spread to the hue in degrees)
 * B button : toggles brush size randomization (adds a random spread to the size)
 * X button : change blendmode to among
 * 		1. source-over (default) : (overwrites canvas with each brush stroke)
 * 		2. lighten : keeps the lightest color value while overwriting
 * 		3. soft-light: dark values in the source get darker and light values get lighter
 * Y button : currently unmapped
 * Dup button : choose (up to 4) colors on the wheel to create a custom gradient
 * 		> 1 color mode allows you to play with the chroma of only that one color
 * 		> 2 color mode allows to explore a cyclic RGB gradient of those two colors
 * 		> same as above for 3 & 4 colors
 * 		> button tops out at 4. Press Dleft to move to selected gradient space
 * Dleft button : End color selection. Press again to go back to default gradient space
 * Ddown button : Overlay current gradient on cursor (press & hold)
 * Dleft button : currently unmapped
 * Start button : Save current sketch (downloads it as a png)
 * Menu button : Cannot be assigned (due to interference with windows game mode)
 * Select button : Clear canvas (have to press it 3 times)
 */

/**
 * Bug list:
 * 3.	Linear interpolation for diametrically opposite colors does not work
 * 
 * 		-- idk how to fix this; problem needs to be recontextualized before
 * 		any further work is done on it
 * 
 * 4.	Framerate drops to ~40fps during non-default blend modes
 * 
 * 		-- issue will be fixed if JS is dropped. Can be done (?)
 * 		I like p5.java, but p5.cpp may be best for performance
 */

/**
 * Requested feature list:
 * 1.	A button to select the current H,S value on the color stick
 * 2.	Direct eraser button
 * 3.	Keymapping mode
 * 4.	Framerate checker (debug mode addition) **HALF DONE**
 * 5.	Undo mode (requires many many hours to implement; maybe) **IMPORTANT**
 * 6. 	Beginner / Tutorial mode
 * 7.	Multi-mode environment
 */

/**
 * Feature removal / changes:
 * 1.	Color & brush size randomizer were not used during user testing
 * 2.	Select & Start mappings to save & clear were not very unambiguous.
 * 		Maybe add a dialogue option?
 */

let enable_webGL = false;
let controllers = []
let debug_mode = false;
let deadzone = 0.08; // change according to your calibration

let released = [];
let pressed = [];

let screen_renderer; // the final canvas on the screen
let main_sketch;   // for the actual drawing
let undo_sketch;   // to enable undos
let redo_sketch;   // to save main sketch before the undo
let save_sketch;   // sketch onto which image is saved
let saved_for_undo = false;
let undo_pressed = false;
let redo_pressed = false;
// to flip between the undo/redo button's two states
let undo_redo_selector = false;

// to define the background color
let bg_hue = 0;
let bg_sat = 0;
let bg_bright = 0;

let paint, brush, paintbrush;

let xdim = 1920;
let ydim = 1080;

let erase_counter = 0;

let xbox_axismap = {
	LSX: 0,
	LSY: 1,
	RSX: 2,
	RSY: 3,
	LT: 4,
	RT: 5
};

let xbox_keymap = {
	A: 0,
	B: 1,
	X: 3,
	Y: 2,
	LB: 4,
	RB: 5,
	LT: 6, // use value as axis if axis_len == 4
	RT: 7, // use value as axis if axis_len == 4
	Select: 8,
	Start: 9,
	LSB: 10,
	RSB: 11,
	DUp: 12,
	DDown: 13,
	DLeft: 14,
	DRight: 15,
	Menu: 16
};

function setup() {
	main_sketch = createGraphics(xdim,ydim);
	undo_sketch = createGraphics(xdim, ydim);
	redo_sketch = createGraphics(xdim, ydim);
	save_sketch = createGraphics(xdim, ydim);

	if (enable_webGL)
		screen_renderer = createCanvas(xdim, ydim, WEBGL);
	else
		screen_renderer = createCanvas(xdim, ydim);
	
	frameRate(60);
	colorMode(HSB);
	background(bg_hue, bg_sat, bg_bright);
	noStroke();
	window.addEventListener("gamepadconnected", function(e) {
		gamepadHandler(e, true);
		console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
		e.gamepad.index, e.gamepad.id,
		e.gamepad.buttons.length, e.gamepad.axes.length);
	});
	window.addEventListener("gamepaddisconnected", function(e) {
		console.log("Gamepad disconnected from index %d: %s",
		e.gamepad.index, e.gamepad.id);
		gamepadHandler(e, false);
	});
	for (var i = 0; i < 17; i++) {
		released[i] = true;
		pressed[i] = false;
	}
	
	paint = new Paint([BLEND, LIGHTEST, SOFT_LIGHT]);
	brush = new Brush(xdim, ydim);
	paintbrush = new PaintBrush(paint, brush);

	paint.set_blendmode(main_sketch);

	// fullscreen(true);
}

function draw() {
	
	if (enable_webGL)
		translate(-width/2,-height/2,0);

	controller_event_handler();

	colorMode(HSB);
	background(color(bg_hue, bg_sat, bg_bright));	
	image(main_sketch, 0, 0);

	paintbrush.show_current_paintbrush();

	// colorMode(HSB);
	// let fps = int(frameRate());
	// fill(color(0,0,100));
	// textSize(20);
	// text(fps, 50, 50);
}

function save_for_undo(){
	saved_for_undo = true;
	redo_pressed = false;
	undo_pressed = false;
	undo_sketch.image(main_sketch, 0, 0);
}

function do_undo(){
	if (saved_for_undo == false){
		// cannot undo if not saved for it beforehand
		// also cannot undo more than once
		return;
	}

	saved_for_undo = false;
	if (redo_pressed == true)
		redo_pressed = false;

	// save main sketch to reload for later
	redo_sketch.clear();
	redo_sketch.image(main_sketch, 0, 0);

	main_sketch.clear();
	main_sketch.image(undo_sketch, 0, 0);

	undo_pressed = true;
}

function do_redo(){
	if (redo_pressed == false && undo_pressed == true){
		save_for_undo();
		main_sketch.clear();
		main_sketch.image(redo_sketch, 0, 0);
		redo_pressed = true;
	}
}

function reset_all(){
	erase_counter = 0;
	colorMode(RGB);
	main_sketch.clear();
	redo_sketch.clear();
	undo_sketch.clear();
	// save_for_undo(); // TODO implement this
	saved_for_undo = false;
	undo_pressed = false;
	redo_pressed = false;
	undo_redo_selector = false;

	paint.reset();
	brush.reset();
	paintbrush.reset();
	paint.set_blendmode(main_sketch);

	undo_redo_selector = false;
	bg_hue = 0;
	bg_sat = 0;
	bg_bright = 0;

	console.log("Canvas erased. All modes cleared to default");
}

function controller_event_handler() {
	var gamepads = navigator.getGamepads();
	
	for (let i in controllers) {

		let controller = gamepads[i];
		
		// first handle axes
		if (controller.axes) {
			for (let ax = 0; ax < controller.axes.length; ax++) {
				let val = controller.axes[ax];
				switch(ax){
					case xbox_axismap["LSX"]:
						if (abs(val) > deadzone) {
							
							brush.moveX(val);
							
							if (debug_mode)
								console.log("LSX is being triggered");
						}
						break;
					case xbox_axismap["LSY"]:
						if (abs(val) > deadzone) {
							
							brush.moveY(val);
							
							if (debug_mode)
								console.log("LSY is being triggered");
						}
						break;
					case xbox_axismap["RSX"]:
						if (abs(val) > deadzone) {
							
							paint.update_HSX(val);

							if (debug_mode){
								console.log("RSX is being triggered");
							}
						}
						break;
					case xbox_axismap["RSY"]:
						if (abs(val) > deadzone) {

							paint.update_HSY(val);
							
							if (debug_mode){
								console.log("RSY is being triggered");
							}
						}
						break;
					case xbox_axismap["RT"]:
						if (controller.axes && controller.axes.length == 6)
							paintbrush.draw_on_canvas(main_sketch, val, false);
						break;
					case xbox_axismap["LT"]:
						if (controller.axes && controller.axes.length == 6)
							paint.update_brightness(val, false);
						break;
				}
			}
		}

		// now handle buttons

		if (controller.buttons) {
			for (var btn = 0; btn < controller.buttons.length; btn++) {
				let val = controller.buttons[btn];
				switch(btn){
					case xbox_keymap["Y"]:
						if (buttonPressed(val, btn)) {
							bg_hue = paint.my_hue;
							bg_sat = paint.my_sat;
							bg_bright = paint.my_bright;
							if(debug_mode){
								console.log("Pressed Y");
							}
						}
						break;
					case xbox_keymap["B"]:
						if (buttonPressed(val, btn)) {
							if (undo_redo_selector == false)
								do_undo();
							else
								do_redo();

							undo_redo_selector = !undo_redo_selector;
							
							if(debug_mode){
								console.log("Pressed B");
							}
						}
						break;
					case xbox_keymap["X"]:
						if (buttonPressed(val, btn)) {
							
							paint.cycle_blendmode(main_sketch);
							
							if(debug_mode){
								console.log("Pressed X");
							}
						}
						break;
					case xbox_keymap["A"]:
						if (buttonPressed(val, btn)){
							if(debug_mode){
								console.log("Pressed A");
							}
						}
						break;
					case xbox_keymap["DUp"]:
						if (buttonPressed(val, btn)){
							
							paint.add_current_hue_to_custom_palette();

							if(debug_mode){
								console.log("Pressed DUp");
							}
						}
						break;
					case xbox_keymap["DRight"]:
						if (buttonPressed(val, btn)){
							
							paint.toggle_custom_palette();

							if(debug_mode){
								console.log("Pressed DRight");
							}
						}
						break;
					case xbox_keymap["DDown"]:
						if (buttonPressed(val, btn)){
							
							paintbrush.toggle_cursor_display();

							console.log("Showing current color palette gradient on cursor");

							if(debug_mode){
								console.log("Pressed DDown");
							}
						}
						break;
					case xbox_keymap["DLeft"]:
						if (buttonPressed(val, btn)){

							brush.cycle_brush_shape();

							if(debug_mode){
								console.log("Pressed DLeft");
							}
						}
						break;
					case xbox_keymap["RB"]:
						if (buttonPressed(val, btn)) {
							
							brush.toggle_brush_size_lock();

							if(debug_mode){
								console.log("Pressed RB");
							}
						}
						break;
					case xbox_keymap["LB"]:
						if (buttonPressed(val, btn)) {
							
							paint.toggle_set_brightness();

							if(debug_mode){
								console.log("Pressed LB");
							}
						}
						break;
					case xbox_keymap["Start"]:
						if (buttonPressed(val, btn)) {
							
							save_sketch.clear();
							colorMode(HSB);
							save_sketch.background(color(bg_hue, bg_sat, bg_bright));	
							save_sketch.image(main_sketch, 0, 0);
							saveCanvas(save_sketch);

							console.log("Downloaded sketch");

							if(debug_mode){
								console.log("Pressed Start");
							}
						}
						break;
					case xbox_keymap["Menu"]:
						if (buttonPressed(val, btn)){
							if(debug_mode){
								console.log("Pressed Menu");
							}
						}
						break;
					case xbox_keymap["Select"]:
						if (buttonPressed(val, btn)) {

							if(debug_mode){
								console.log("Pressed Select");
							}

							if(erase_counter == 3){
								reset_all();
							} else{
								console.log("Press the button " + (3-erase_counter) + " more times to erase canvas");
								erase_counter++;
							}
						}
						break;
					case xbox_keymap["RT"]:
						if (controller.axes && controller.axes.length == 4)
							paintbrush.draw_on_canvas(main_sketch, val, true);
						break;
					case xbox_keymap["LT"]:
						if (controller.axes && controller.axes.length == 4)
							paint.update_brightness(val, true);
						break;
					case xbox_keymap["LSB"]:
						if (buttonPressed(val, btn)) {
							
							paint.toggle_set_saturation();

							if(debug_mode){
								console.log("Pressed LSB");
							}
						}
						break;
					case xbox_keymap["RSB"]:
						if (buttonPressed(val, btn)) {

							brush.cycle_max_brush_size();

							if(debug_mode){
								console.log("Pressed RSB");
							}
						}
						break;
				}
			}
		}
		
	}
}

function gamepadHandler(event, connecting) {
	let gamepad = event.gamepad;
	if (connecting) {
	print("Connecting to controller " + gamepad.index);
	controllers[gamepad.index] = gamepad;
	} else {
	delete controllers[gamepad.index];
	}
}

function buttonPressed(b, index){
	if (typeof(b) == "object"){
		let flipped_on = false;
		if(b.pressed){
			if(pressed[index] == false){
				flipped_on = true;
				pressed[index] = true;
				released[index] = false;
			}
		} else {
			if(released[index] == false){
				released[index] = true;
				pressed[index] = false;
			}
		}
		return flipped_on;
	}
	return b > 0.9;
}

function cartesian_to_angle(x, y){
	let angle = (Math.atan2(y, x) * 180) / Math.PI;
	if (angle < 0) {
		angle = 360 + angle; // angle is in degrees, belonging to [0,360] cyclic
	}
	return angle;
};

class Brush {

	constructor(sketch_width, sketch_height){
		this.my_width = sketch_width;
		this.my_height = sketch_height;
		this.brush_shapes = ['circle', 'ellipse'];
		this.move_speed = 7;

		this.reset();
	};

	reset(){
		this.posX = this.my_width/2;
		this.posY = this.my_height/2;
		this.velX = 0;
		this.velY = 0;
		this.brush_size = 5;
		this.min_brush_size = 5;
		this.max_brush_size = 40;
		this.max_brush_size_first_step = 40;
		this.max_brush_size_multiplier = 1;
		this.max_brush_size_max_steps = 4;
		this.brush_shape_index = 0;
		this.is_brush_size_set = false;
	}

	moveX(val){
		if ((this.posX <= 0 && val > 0) || (this.posX >= this.my_width && val < 0) || (this.posX > 0 && this.posX < this.my_width)) {
			this.velX = this.move_speed * val * (60/frameRate());
			this.posX += this.velX;
		}
	}

	moveY(val){
		if ((this.posY <= 0 && val > 0) || (this.posY >= this.my_height && val < 0) || (this.posY > 0 && this.posY < this.my_height)) {
			this.velY = this.move_speed * val * (60/frameRate());
			this.posY += this.velY;
		}
	}

	update_brush_size(val, is_button){
		if (is_button){
			// remap value to lie in [-1,1] instead of [0,1]
			val = 2*val.value - 1;
		}

		if(!this.is_brush_size_set){
			this.brush_size = this.min_brush_size + ((val+1)/2)*this.max_brush_size;
		}		
	}

	cycle_max_brush_size(){
		this.max_brush_size_multiplier++;
		if (this.max_brush_size_multiplier > this.max_brush_size_max_steps)
			this.max_brush_size_multiplier = 1;
		this.max_brush_size = this.max_brush_size_multiplier * this.max_brush_size_first_step;
	}

	cycle_brush_shape(){
		this.brush_shape_index = (this.brush_shape_index + 1) % this.brush_shapes.length;
	}

	toggle_brush_size_lock(){
		this.is_brush_size_set = !this.is_brush_size_set
	}
};

class Paint {
	// pass the list of blendmodes;
	// first element is default
	constructor(blendmode_list){
		this.reset();
		this.blendmode_selector_list = blendmode_list;
	}

	reset(){
		this.my_hue = 0;
		this.my_sat = 0;
		this.my_bright = 100;

		// indicator for where the analog stick is in HS space
		this.huesatX = 0;
		this.huesatY = 0;

		this.is_bright_set = false;
		this.is_sat_set = false;
		this.custom_palette_hues = [];
		this.are_custom_palette_hues_selected = false;

		this.blendmode_selector = 0;
	}

	cartesian_to_hue(x, y) {
	
		let angle = cartesian_to_angle(x, y);
	
		if (this.custom_palette_hues.length > 0 && this.are_custom_palette_hues_selected){
	
			// if a custom gradient is selected
	
			if (this.custom_palette_hues.length == 1)
				return this.custom_palette_hues[0];
			else {
				let gradient_hue_index1 = floor(angle/(360/this.custom_palette_hues.length));
				let gradient_hue_index2 = (gradient_hue_index1+1) % this.custom_palette_hues.length;
	
				colorMode(HSB);
				let blend_color1 = color(this.custom_palette_hues[gradient_hue_index1], 100, 100);
				let blend_color2 = color(this.custom_palette_hues[gradient_hue_index2], 100, 100);
				let max_val_for_lerp = 360/this.custom_palette_hues.length;
				let lerp_ret = lerpColor(blend_color1, blend_color2, (angle % max_val_for_lerp)/max_val_for_lerp);
				return hue(lerp_ret);
			}
		}
		
		// angle in degrees is how my_hue is processed anyways by default
		return angle;
	}

	__update_HS(){
		this.my_hue = this.cartesian_to_hue(this.huesatX, this.huesatY);

		if (!this.is_sat_set){
			let new_sat = Math.sqrt((this.huesatX*this.huesatX + this.huesatY*this.huesatY));
			if (new_sat > 0.9){
				this.my_sat = 100;
			} else {
				this.my_sat = new_sat*100;
			}
		}
	}

	update_HSX(val){
		this.huesatX = val;
		this.__update_HS();
	}
	update_HSY(val){
		this.huesatY = val;
		this.__update_HS();
	}

	update_brightness(val, is_button){
		if (is_button){
			// remap value to lie in [-1,1] instead of [0,1]
			val = 2*val.value - 1;
		}

		if (!this.is_bright_set){
			if(val != 0){
				if (val != -1){
					this.my_bright = 50*(1-val);
				}
				else{
					this.my_bright = 100;
				}
			}
		}
	}

	set_blendmode(canvas){
		canvas.blendMode(this.blendmode_selector_list[this.blendmode_selector]);
	}

	cycle_blendmode(canvas){
		this.blendmode_selector = (this.blendmode_selector+1) % this.blendmode_selector_list.length;
		canvas.blendMode(this.blendmode_selector_list[this.blendmode_selector]);
	}

	add_current_hue_to_custom_palette(){
		if (this.custom_palette_hues.length < 4 && !this.are_custom_palette_hues_selected){
			this.custom_palette_hues.push(this.my_hue);
		}
	}

	toggle_custom_palette(){
		if (this.custom_palette_hues.length > 0){
			this.are_custom_palette_hues_selected = !this.are_custom_palette_hues_selected;
			if (!this.are_custom_palette_hues_selected){
				this.custom_palette_hues = [];
			}
		}
	}

	toggle_set_saturation(){
		this.is_sat_set = !this.is_sat_set;
	}

	toggle_set_brightness(){
		this.is_bright_set = !this.is_bright_set;
	}
};

class PaintBrush {
	constructor(paint, brush){
		this.paint = paint;
		this.brush = brush;

		this.min_cursor_size = 10;
		this.max_cursor_size = 40;

		this.reset();
	}

	reset(){
		this.stroke_applied = false;
		this.show_gradient_on_cursor = false;
	}

	toggle_cursor_display(){
		this.show_gradient_on_cursor = !this.show_gradient_on_cursor;
	}

	show_current_paintbrush(){
		// to only show the paintbrush, not to commit to it on main_sketch

		if (this.show_gradient_on_cursor){
			this.__draw_cursor();
		}

		colorMode(HSB);
		fill(color(this.paint.my_hue, this.paint.my_sat, this.paint.my_bright));

		let cursor_size_temp;
		
		if (this.show_gradient_on_cursor){
			cursor_size_temp = this.brush.brush_size > this.min_cursor_size ?
								this.brush.brush_size :
								(this.brush.max_brush_size-this.brush.min_brush_size)/2;
		} else {
			cursor_size_temp = this.brush.brush_size > 0 ?
								this.brush.brush_size :
								(this.brush.max_brush_size-this.brush.min_brush_size)/2;
		}
		
		if(this.brush.brush_shapes[this.brush.brush_shape_index] == 'circle'){
			circle(this.brush.posX, this.brush.posY, cursor_size_temp);
		} else if(this.brush.brush_shapes[this.brush.brush_shape_index] == 'ellipse') {
			push();
			translate(this.brush.posX, this.brush.posY);
			rotate(cartesian_to_angle(this.brush.velX, this.brush.velY));
			ellipse(0, 0, cursor_size_temp, cursor_size_temp/2);
			pop();
		}
	}

	draw_on_canvas(canvas, val, is_button){
		
		this.brush.update_brush_size(val, is_button);
	
		if (this.show_gradient_on_cursor == true)
			return;
	
		if(val != -1 && val != 0){
	
			if (this.stroke_applied == false) {
				// brush is being applied for the first time
				save_for_undo();
				undo_redo_selector = false;
				this.stroke_applied = true; 
			}

			canvas.noStroke();
			colorMode(HSB); //, 360, 100, 100, 100);
			canvas.fill(color(this.paint.my_hue, this.paint.my_sat, this.paint.my_bright));
			
			if (this.brush.brush_shapes[this.brush.brush_shape_index] == 'circle'){
				canvas.circle(this.brush.posX, this.brush.posY, this.brush.brush_size);
			}
			else if(this.brush.brush_shapes[this.brush.brush_shape_index] == 'ellipse'){
				canvas.push();
				canvas.translate(this.brush.posX, this.brush.posY);
				angleMode(DEGREES);
				canvas.rotate(cartesian_to_angle(this.brush.velX, this.brush.velY));
				canvas.ellipse(0, 0, this.brush.brush_size, this.brush.brush_size/2);
				canvas.pop();
			}
			
		} else {
			if (this.stroke_applied == true){
				this.stroke_applied = false;
			}
		}
	}
	
	__draw_cursor(){
		colorMode(HSB);
		for(var x = this.brush.posX-this.max_cursor_size; x < this.brush.posX+this.max_cursor_size; x++){
			if (x < 0 || x > width)
				continue;
			for(var y = this.brush.posY-this.max_cursor_size; y < this.brush.posY+this.max_cursor_size; y++){
				if (y < 0 || y > height)
					continue;

				let xstep = x - this.brush.posX;
				let ystep = y - this.brush.posY;
				let rad = Math.sqrt((xstep*xstep + ystep*ystep));

				if ( rad > this.min_cursor_size && rad <= this.max_cursor_size ){
					
					let cursor_hue = this.paint.cartesian_to_hue(xstep, ystep);
					let cursor_angle = cartesian_to_angle(xstep, ystep);
					let cursor_sat = (rad/this.max_cursor_size)*100;
					let cursor_bright = 100;
					
					let smallest_angle_diff = Infinity;
					
					// to be able to add current hue being pointed to;
					// so it shows up highlighted
					let custom_palette_hues_extended;
					if (!this.paint.are_custom_palette_hues_selected)
						custom_palette_hues_extended = [...this.paint.custom_palette_hues];
					else custom_palette_hues_extended = [];
	
					if (this.paint.my_sat > 50)
						custom_palette_hues_extended.push(cartesian_to_angle(this.paint.huesatX, this.paint.huesatY));
	
					if (custom_palette_hues_extended.length > 0){
						for (var i = 0; i < custom_palette_hues_extended.length; i++){
							let angle_diff;
							angle_diff = custom_palette_hues_extended[i] - cursor_angle;
							
							if (angle_diff > 360)
								angle_diff -= 360;
							if (angle_diff < 0)
								angle_diff += 360;
	
							if(abs(angle_diff) < smallest_angle_diff)
								smallest_angle_diff = abs(angle_diff); 
						}
	
						if(smallest_angle_diff > 10)
							cursor_bright = 50;
					}
					
					fill(color(cursor_hue, cursor_sat, cursor_bright));
					circle(x,y,2);
				}
			}
		}
	}
};