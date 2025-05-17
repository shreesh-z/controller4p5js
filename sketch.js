/**
 * Instructions: Attach an Xbox controller and press the play button on the website
 * 
 * Key mapping:
 * 
 * Left stick (LSX,LSY) : Moves the cursor
 * Right stick (RSX,RSY): Changes color (in hue & saturation color space)
 * Right trigger (RT): Brush (size varies acc. to how much you press the trigger)
 * Left trigger (LT): Changes brightness
 * Right shoulder (RB): Locks (& unlocks) a set brush size
 * Left shoulder (LB): Locks (& unlocks) a set brightness
 * LS button (LSB): Locks (& unlocks) a set saturation
 * RS button (RSB): cycles max brush sizes
 * A button : Toggle between color palette mode and layer mode
 * B button : Undo / Redo
 * X button : change blendmode to among
 * 		1. source-over (default) : (overwrites canvas with each brush stroke)
 * 		2. lighten : keeps the lightest color value while overwriting
 * 		3. soft-light: dark values in the source get darker and light values get lighter
 * Y button : Sets background color to currently chosen HSV color
 * 
 * In Color Palette Mode (cursor shows current brush type & color palette):
	Dup button : choose (up to 4) colors on the wheel to create a custom gradient
		> 1 color mode allows you to play with the chroma of only that one color
		> 2 color mode allows to explore a cyclic RGB gradient of those two colors
		> same as above for 3 & 4 colors
		> button tops out at 4. Press Dleft to move to selected gradient space
	Dright button : End color selection. Press again to go back to default gradient space
	Ddown button : Overlay current gradient on cursor (press & hold)
	Dleft button : Cycle between brush types (currently circle & ellipse)
 * 
 * In Layer Mode (cursor shows current layer):
	Dup button : Go up one layer
	Ddown button : Go down one layer
	Dright button : Toggle transparency/opacity of layer
	Dleft button : currently unmapped
 * Start button : Save current sketch (downloads it as a png)
 * Menu button : Cannot be assigned (due to interference with windows game mode)
 * Select button : Clear canvas (have to press it 4 times)
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
 * 		-- Partially fixed by scaling movement speed based on framerate
 */

/**
 * Requested feature list:
 * 1.	A button to select the current H,S value on the color stick - no
 * 2.	Direct eraser button - no
 * 3.	Keymapping mode
 * 4.	Framerate checker (debug mode addition) *done*
 * 5.	Undo mode (requires many many hours to implement; maybe) **IMPORTANT**
 * 		-- half done, layer manager in works
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
let keymap_debug_mode = false; 
let show_framerate = true;
let mean_framerate = 0;
let framerate_averager = 0;
let framerate_max_count = 30;
let framerate_iterator = 0;
let deadzone = 0.08; // change according to your calibration

let released = [];
let pressed = [];

let paint, brush, paintbrush, layer_manager;

let layer_or_palette_mode = false;
let show_active_layer_only = false;

let xdim = 1920;
let ydim = 1080;
let hud_height = 100;

let hud_image;

let erase_counter = 0;

let axismap = {
	LSX: 0,
	LSY: 1,
	RSX: 2,
	RSY: 3,
	LT: 4,
	RT: 5
};

let keymap = {
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

	if (enable_webGL)
		createCanvas(xdim, ydim + hud_height, WEBGL);
	else
		createCanvas(xdim, ydim + hud_height);

	hud_image = createGraphics(xdim, hud_height);
	hud_image.clear();
	
	frameRate(60);
	colorMode(HSB);

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

	layer_manager = new LayerManager(xdim, ydim);
	paint = new Paint([BLEND, LIGHTEST, SOFT_LIGHT]);
	brush = new Brush(xdim, ydim);
	paintbrush = new PaintBrush(paint, brush);

	paint.set_blendmode(layer_manager);
	background(layer_manager.get_bg_color());
}

function draw() {
	
	if (enable_webGL)
		translate(-width/2,-height/2,0);

	colorMode(HSB);
	background(layer_manager.get_bg_color());

	if (keymap_debug_mode){
		drawGamepad();
		return;
	}

	controller_event_handler();

	if (show_active_layer_only){
		image(layer_manager.get_active_layer(), 0, 0);
	} else {
		image(layer_manager.get_full_sketch(), 0, 0);
	}

	if (layer_or_palette_mode == false){
		paintbrush.show_current_paintbrush();
	} else {
		textSize(20);
		colorMode(HSB);
		if (show_active_layer_only){
			fill(0,0,25);
			circle(brush.posX, brush.posY, 50);
		}
		if (layer_manager.is_active_layer_transparent())
			fill(color(0, 0, 50));
		else fill(color(0, 0, 100));

		text(layer_manager.active_layer_index+1, brush.posX-5, brush.posY+7);
	}

	draw_HUD();
}

function draw_HUD(){
	// hud_image.colorMode(HSB);
	hud_image.background(0,0,0);

	// make bounding rect
	hud_image.colorMode(HSB);
	hud_image.strokeWeight(5);
	hud_image.stroke(0,0,50);
	hud_image.fill(0,0,0);
	hud_image.rect(0, 0, xdim, hud_height);

	hud_image.textAlign(CENTER, CENTER);

	// draw brush type & color
	hud_image.noStroke();
	hud_image.fill(0,0,100);
	hud_image.textSize(20);
	hud_image.text("Brush", 50, 85);
	paintbrush.show_brush_on_hud(hud_image, 50, 37);

	let blendmode_text = paint.blendmode_selector_list[paint.blendmode_selector];
	
	// blend mode
	hud_image.fill(0,0,100);
	hud_image.textSize(18);
	hud_image.text(blendmode_text, 150, 37);
	hud_image.textSize(20);
	hud_image.text("BlendMode", 150, 85);

	// current active layer
	hud_image.fill(0,0,100);
	hud_image.textSize(18);
	hud_image.text(layer_manager.active_layer_index+1, 250, 37);
	hud_image.textSize(20);
	hud_image.text("Layer", 250, 85);

	// brush size set or not
	hud_image.fill(0,0,100);
	hud_image.textSize(18);
	hud_image.text(brush.is_brush_size_set, 370, 37);
	hud_image.textSize(20);
	hud_image.text("BrushSize Set", 370, 85);

	// brightness set or not
	hud_image.fill(0,0,100);
	hud_image.textSize(18);
	hud_image.text(paint.is_bright_set, 500, 37);
	hud_image.textSize(20);
	hud_image.text("BrightSet", 500, 85);

	// saturation set or not
	hud_image.fill(0,0,100);
	hud_image.textSize(18);
	hud_image.text(paint.is_sat_set, 600, 37);
	hud_image.textSize(20);
	hud_image.text("SatSet", 600, 85);

	if (show_framerate){
		if (framerate_iterator < framerate_max_count){
			framerate_averager += int(frameRate());
			framerate_iterator += 1;
		} else {
			mean_framerate = framerate_averager/framerate_max_count;
			framerate_averager = 0;
			framerate_iterator = 0;
		}

		hud_image.colorMode(HSB);
		hud_image.fill(color(0,0,100));
		hud_image.textSize(20);
		hud_image.text(int(mean_framerate), xdim-50, 50);
	}

	image(hud_image, 0, ydim);
}

function reset_all(){
	erase_counter = 0;
	
	layer_manager.reset();
	paint.reset();
	brush.reset();
	paintbrush.reset();
	paint.set_blendmode(layer_manager);

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
					case axismap["LSX"]:
						if (abs(val) > deadzone) {
							
							brush.moveX(val);
							
							if (debug_mode)
								console.log("LSX is being triggered");
						}
						break;
					case axismap["LSY"]:
						if (abs(val) > deadzone) {
							
							brush.moveY(val);
							
							if (debug_mode)
								console.log("LSY is being triggered");
						}
						break;
					case axismap["RSX"]:
						if (abs(val) > deadzone) {
							
							paint.update_HSX(val);

							if (debug_mode){
								console.log("RSX is being triggered");
							}
						}
						break;
					case axismap["RSY"]:
						if (abs(val) > deadzone) {

							paint.update_HSY(val);
							
							if (debug_mode){
								console.log("RSY is being triggered");
							}
						}
						break;
					case axismap["RT"]:
						if (controller.axes && controller.axes.length == 6)
							paintbrush.draw_on_canvas(layer_manager, val, false);
						break;
					case axismap["LT"]:
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
					case keymap["Y"]:
						if (buttonPressed(val, btn)) {

							layer_manager.set_bg(paint);

							if(debug_mode){
								console.log("Pressed Y");
							}
						}
						break;
					case keymap["B"]:
						if (buttonPressed(val, btn)) {
							
							// only allow undo/redo if stroke has been lifted
							if (paintbrush.stroke_applied == false)
								layer_manager.toggle_undo_pressed();
							
							if(debug_mode){
								console.log("Pressed B");
							}
						}
						break;
					case keymap["X"]:
						if (buttonPressed(val, btn)) {
							
							paint.cycle_blendmode(layer_manager);
							
							if(debug_mode){
								console.log("Pressed X");
							}
						}
						break;
					case keymap["A"]:
						if (buttonPressed(val, btn)){

							layer_or_palette_mode = !layer_or_palette_mode;

							if(debug_mode){
								console.log("Pressed A");
							}
						}
						break;
					case keymap["DUp"]:
						if (buttonPressed(val, btn)){
							
							if (layer_or_palette_mode == false)
								paint.add_current_hue_to_custom_palette();
							else{
								if (paintbrush.stroke_applied == false)
									layer_manager.go_up_one_layer();
							}

							if(debug_mode){
								console.log("Pressed DUp");
							}
						}
						break;
					case keymap["DRight"]:
						if (buttonPressed(val, btn)){
							
							if (layer_or_palette_mode == false)
								paint.toggle_custom_palette();
							else{
								if (paintbrush.stroke_applied == false)
									layer_manager.toggle_active_layer_transparency();
							}

							if(debug_mode){
								console.log("Pressed DRight");
							}
						}
						break;
					case keymap["DDown"]:
						if (buttonPressed(val, btn)){
							
							if (layer_or_palette_mode == false){
								paintbrush.toggle_cursor_display();
								console.log("Showing current color palette gradient on cursor");
							} else {
								if (paintbrush.stroke_applied == false)
									layer_manager.go_down_one_layer();
							}

							if(debug_mode){
								console.log("Pressed DDown");
							}
						}
						break;
					case keymap["DLeft"]:
						if (buttonPressed(val, btn)){

							if (layer_or_palette_mode == false){
								brush.cycle_brush_shape();
							} else {
								show_active_layer_only = !show_active_layer_only;
							}

							if(debug_mode){
								console.log("Pressed DLeft");
							}
						}
						break;
					case keymap["RB"]:
						if (buttonPressed(val, btn)) {
							
							brush.toggle_brush_size_lock();

							if(debug_mode){
								console.log("Pressed RB");
							}
						}
						break;
					case keymap["LB"]:
						if (buttonPressed(val, btn)) {
							
							paint.toggle_set_brightness();

							if(debug_mode){
								console.log("Pressed LB");
							}
						}
						break;
					case keymap["Start"]:
						if (buttonPressed(val, btn)) {
							
							layer_manager.download_sketch();

							console.log("Downloaded sketch");

							if(debug_mode){
								console.log("Pressed Start");
							}
						}
						break;
					case keymap["Menu"]:
						if (buttonPressed(val, btn)){
							if(debug_mode){
								console.log("Pressed Menu");
							}
						}
						break;
					case keymap["Select"]:
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
					case keymap["RT"]:
						if (controller.axes && controller.axes.length == 4)
							paintbrush.draw_on_canvas(layer_manager, val, true);
						break;
					case keymap["LT"]:
						if (controller.axes && controller.axes.length == 4)
							paint.update_brightness(val, true);
						break;
					case keymap["LSB"]:
						if (buttonPressed(val, btn)) {
							
							paint.toggle_set_saturation();

							if(debug_mode){
								console.log("Pressed LSB");
							}
						}
						break;
					case keymap["RSB"]:
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