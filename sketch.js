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
let debug_mode = true;
let deadzone = 0.08; // change according to your calibration

let released = [];
let pressed = [];

let brush_size = 5;
let min_brush_size = 5;
let max_brush_size = 40;
let posX, posY;
let my_hue, my_sat, my_bright;
let huesatX, huesatY;
let moveSpeed = 5;

let brush_size_set = false;
let bright_set = false;
let saturation_set = false;

let main_sketch;   // for the actual drawing
let undo_sketch;   // to enable undos
let redo_sketch;   // to save main sketch before the undo
let saved_for_undo = false;
let redo_pressed = false;
let undo_checkpoint_pressed = false;
let brush_applied = false;

let xdim = 1920;
let ydim = 1080;

// used to keep track of gradient colors being mixed
let gradient_hues = []
let gradient_hues_selected = false;

let show_gradient_on_cursor = false;

let blendmode_selector = 0;
let blendmode_selector_list;

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

	if (enable_webGL)
		createCanvas(xdim, ydim, WEBGL);
	else
		createCanvas(xdim, ydim);
	
	frameRate(240);
	background(0, 0, 0);
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
	posX = width / 2;
	posY = height / 2;

	my_hue = 0; // max 360
	my_sat = 0; // max 100
	my_bright = 100; // max 100

	blendmode_selector_list = [BLEND, LIGHTEST, SOFT_LIGHT];
	blendmode_selector = 0;
	main_sketch.blendMode(blendmode_selector_list[blendmode_selector]);

	// fullscreen(true);
}

function cartesian_to_angle(x, y){
	let angle = (Math.atan2(y, x) * 180) / Math.PI;
	if (angle < 0) {
		angle = 360 + angle; // angle is in degrees, belonging to [0,360] cyclic
	}

	return angle;
}

function cartesian_to_hue(x, y) {
	
	let angle = cartesian_to_angle(x, y);

	if (gradient_hues.length > 0 && gradient_hues_selected){

		// if a custom gradient is selected

		if (gradient_hues.length == 1)
			return gradient_hues[0];
		else {
			let gradient_hue_index1 = floor(angle/(360/gradient_hues.length));
			let gradient_hue_index2 = (gradient_hue_index1+1) % gradient_hues.length;

			colorMode(HSB);
			let blend_color1 = color(gradient_hues[gradient_hue_index1], 100, 100);
			let blend_color2 = color(gradient_hues[gradient_hue_index2], 100, 100);
			let max_val_for_lerp = 360/gradient_hues.length;
			let lerp_ret = lerpColor(blend_color1, blend_color2, (angle % max_val_for_lerp)/max_val_for_lerp);
			return hue(lerp_ret);
		}
	}
	
	// angle in degrees is how my_hue is processed anyways by default
	return angle;
}

function save_for_undo(){
	saved_for_undo = true;
	redo_pressed = false;
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
}

function do_redo(){
	if (redo_pressed == false){
		save_for_undo();
		main_sketch.clear();
		main_sketch.image(redo_sketch, 0, 0);
		redo_pressed = true;
	}
}

function draw_cursor_gradient(){
	colorMode(HSB);
	for(var x = posX-max_brush_size; x < posX+max_brush_size; x++){
		if (x < 0 || x > width)
			continue;
		for(var y = posY-max_brush_size; y < posY+max_brush_size; y++){
			if (y < 0 || y > height)
				continue;
			let xstep = x - posX;
			let ystep = y - posY;
			let rad = Math.sqrt((xstep*xstep + ystep*ystep));
			if ( rad <= max_brush_size ){
				let cursor_hue = cartesian_to_hue(xstep, ystep);
				let cursor_angle = cartesian_to_angle(xstep, ystep);
				let cursor_sat = (rad/max_brush_size)*100;
				let cursor_bright = 100;
				
				let smallest_hue_diff = Infinity;
				
				let gradient_hues_extended;
				if (!gradient_hues_selected)
					gradient_hues_extended = [...gradient_hues];
				else gradient_hues_extended = [];

				if (my_sat > 50)
					gradient_hues_extended.push(cartesian_to_angle(huesatX, huesatY));

				if (gradient_hues_extended.length > 0){
					for (var i = 0; i < gradient_hues_extended.length; i++){
						let hue_diff;
						hue_diff = gradient_hues_extended[i] - cursor_angle;
						
						if (hue_diff > 360)
							hue_diff -= 360;
						if (hue_diff < 0)
							hue_diff += 360;

						if(abs(hue_diff) < smallest_hue_diff)
							smallest_hue_diff = abs(hue_diff); 
					}

					if(smallest_hue_diff > 10)
						cursor_bright = 50;
				}

				fill(color(cursor_hue, cursor_sat, cursor_bright));
				circle(x,y,2);
			}
		}
	}
}

function draw() {
	
	if (enable_webGL)
		translate(-width/2,-height/2,0);

	controller_event_handler();

	colorMode(RGB);
	background('black');	
	image(main_sketch, 0, 0);

	let cursor_brush_size = brush_size;

	if (show_gradient_on_cursor){
		draw_cursor_gradient();
		cursor_brush_size = (max_brush_size-min_brush_size);
	}
	colorMode(HSB);
	fill(color(my_hue, my_sat, my_bright));
	if(brush_size > 0){
		circle(posX, posY, cursor_brush_size);
	} else {
		circle(posX, posY, (max_brush_size-min_brush_size)/2);
	}

	colorMode(HSB);
	let fps = int(frameRate());
	fill(color(0,0,100));
	textSize(20);
	text(fps, 50, 50);
}

function brush_trigger(val, is_button){

	// change behavior depending on 6 axes mode or 4 axes mode

	if (is_button){
		// remap value to lie in [-1,1] instead of [0,1]
		val = 2*val.value - 1;
	}

	if(!brush_size_set){
		brush_size = min_brush_size + ((val+1)/2)*max_brush_size;
	}
	if(val != -1 && val != 0){

		if (brush_applied == false){
			// brush is being applied for the first time
			// if (undo_checkpoint_pressed == false){
			// 	save_for_undo();
			// }
			brush_applied = true; 
		}

		let new_hue = my_hue;
		let new_brush_size = brush_size;

		main_sketch.noStroke();
		main_sketch.colorMode(HSB, 360, 100, 100, 100);
		main_sketch.fill(color(new_hue, my_sat, my_bright));
		main_sketch.circle(posX, posY, new_brush_size);

		if(debug_mode){
			console.log("RT is being triggered");
		}
	} else {
		if (brush_applied == true){
			brush_applied = false;
		}
	}
}

function brightness_trigger(val, is_button){

	if (is_button){
		// remap value to lie in [-1,1] instead of [0,1]
		val = 2*val.value - 1;
	}

	if (!bright_set){
		if(val != 0){
			if (val != -1){
				my_bright = 50*(1-val);
			}
			else{
				my_bright = 100;
			}
			
			if(val != -1 && debug_mode){
				console.log("LT is being triggered");
			}
		}
	}
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
							if ((posX <= 0 && val > 0) || (posX >= (width) && val < 0) || (posX > 0 && posX < (width))) {	
								posX += moveSpeed * val;
							}
							if (debug_mode)
								console.log("LSX is being triggered");
						}
						break;
					case xbox_axismap["LSY"]:
						if (abs(val) > deadzone) {
							if ((posY <= 0 && val > 0) || (posY >= (height) && val < 0) || (posY > 0 && posY < (height))) {
								posY += moveSpeed * val;
							}
							if (debug_mode)
								console.log("LSY is being triggered");
						}
						break;
					case xbox_axismap["RSX"]:
					case xbox_axismap["RSY"]:
						if (abs(val) > deadzone) {

							if (ax == xbox_axismap["RSX"]){
								huesatX = val;
							}
							else {
								huesatY = val;
							}
							my_hue = cartesian_to_hue(huesatX, huesatY);
							
							if (!saturation_set){
								let new_sat = Math.sqrt((huesatX*huesatX + huesatY*huesatY));
								if (new_sat > 0.9){
									my_sat = 100;
								} else {
									my_sat = new_sat*100;
								}
							}

							if (debug_mode){
								if (ax == xbox_axismap["RSX"])
									console.log("RSX is being triggered");
								else console.log("RSY is being triggered");
							}
						}
						break;
					case xbox_axismap["RT"]:
						if (controller.axes && controller.axes.length == 6)
							brush_trigger(val, false);
						break;
					case xbox_axismap["LT"]:
						if (controller.axes && controller.axes.length == 6)
							brightness_trigger(val, false);
						break;
				}
			}
		}

		// now handle buttons

		if (controller.buttons) {
			for (var btn = 0; btn < controller.buttons.length; btn++) {
				let val = controller.buttons[btn];
				switch(btn){
					case xbox_keymap["A"]:
						if (buttonPressed(val, btn)) {
							// if (undo_checkpoint_pressed == false){
							// 	undo_checkpoint_pressed = true;
								save_for_undo();
							// } else {
							// 	undo_checkpoint_pressed = false;
							// }
							if(debug_mode){
								console.log("Pressed A");
							}
						}
						break;
					case xbox_keymap["B"]:
						if (buttonPressed(val, btn)) {
							do_undo();
							if(debug_mode){
								console.log("Pressed B");
							}
						}
						break;
					case xbox_keymap["X"]:
						if (buttonPressed(val, btn)) {
							blendmode_selector = (blendmode_selector+1) % blendmode_selector_list.length;
							main_sketch.blendMode(blendmode_selector_list[blendmode_selector]);

							console.log("Blend mode changed to " + blendmode_selector_list[blendmode_selector]);
							
							if(debug_mode){
								console.log("Pressed X");
							}
						}
						break;
					case xbox_keymap["Y"]:
						if (buttonPressed(val, btn)){
							do_redo();
							if(debug_mode){
								console.log("Pressed Y");
							}
						}
						break;
					case xbox_keymap["DUp"]:
						if (buttonPressed(val, btn)){
							if (gradient_hues.length < 4 && !gradient_hues_selected){
								gradient_hues.push(my_hue);

								console.log("Selected hue #" + gradient_hues.length + " as part of new palette");
								
								if(debug_mode){
									console.log("Pressed Dup");
								}
							} else {
								console.log("Only up to 4 colors allowed in a custom palette!");
							}
						}
						break;
					case xbox_keymap["DRight"]:
						if (buttonPressed(val, btn)){
							if (gradient_hues.length > 0){
								gradient_hues_selected = !gradient_hues_selected;
								if (!gradient_hues_selected){
									gradient_hues = [];
									console.log("Cleared custom palette");
								}else {
									console.log("Created new custom palette of " + gradient_hues.length + " colors");
								}

								if(debug_mode){
									console.log("Pressed DRight");
								}
							}
						}
						break;
					case xbox_keymap["DDown"]:
						if (buttonPressed(val, btn)){
							show_gradient_on_cursor = !show_gradient_on_cursor;

							console.log("Showing current color palette gradient on cursor");

							if(debug_mode){
								console.log("Pressed DDown");
							}
						}
						break;
					case xbox_keymap["DLeft"]:
						if (buttonPressed(val, btn)){
							if(debug_mode){
								console.log("Pressed DLeft");
							}
						}
						break;
					case xbox_keymap["RB"]:
						if (buttonPressed(val, btn)) {
							brush_size_set = !brush_size_set;

							if (brush_size_set){
								console.log("Locked the brush size to radius " + brush_size + "px");
							} else {
								console.log("Unlocked brush size");
							}

							if(debug_mode){
								console.log("Pressed RB");
							}
						}
						break;
					case xbox_keymap["LB"]:
						if (buttonPressed(val, btn)) {
							bright_set = !bright_set;

							if (bright_set){
								console.log("Locked the brightness to " + my_bright + "%");
							} else {
								console.log("Unlocked brightness");
							}

							if(debug_mode){
								console.log("Pressed LB");
							}
						}
						break;
					case xbox_keymap["Start"]:
						if (buttonPressed(val, btn)) {
							saveCanvas();

							console.log("Downloaded sketch");

							if(debug_mode){
								console.log("Pressed Start");
							}
						}
						break;
					case xbox_keymap["Menu"]:
						if (buttonPressed(val, btn)){
							if(debug_mode){
								console.log("Pressed Select");
							}
						}
						break;
					case xbox_keymap["Select"]:
						if (buttonPressed(val, btn)) {

							if(debug_mode){
								console.log("Pressed Menu");
							}

							if(erase_counter == 3){
								// reset all
								erase_counter = 0;
								main_sketch.colorMode(RGB);
								main_sketch.clear();
								brush_size_set = false;
								saturation_set = false;
								bright_set = false;
								gradient_hues = [];
								gradient_hues_selected = false;
								my_hue = 0; my_sat = 0; my_bright = 100;

								show_gradient_on_cursor = false;

								blendmode_selector = 0;
								main_sketch.blendMode(blendmode_selector_list[blendmode_selector]);

								console.log("Canvas erased. All modes cleared to default");
							} else{
								console.log("Press the button " + (3-erase_counter) + " more times to erase canvas");
								erase_counter++;
							}
						}
						break;
					case xbox_keymap["RT"]:
						if (controller.axes && controller.axes.length == 4)
							brush_trigger(val, true);
						break;
					case xbox_keymap["LT"]:
						if (controller.axes && controller.axes.length == 4)
							brightness_trigger(val, true);
						break;
					case xbox_keymap["LSB"]:
						if (buttonPressed(val, btn)) {
							saturation_set = !saturation_set;

							console.log("Locked color to " + my_hue + " hue and " + my_sat + "% saturation");

							if(debug_mode){
								console.log("Pressed LSB");
							}
						}
						break;
					case xbox_keymap["RSB"]:
						if (buttonPressed(val, btn)) {
							// reset color to white
							my_hue = 0; my_sat = 0; my_bright = 100;

							console.log("Reset color to white");

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