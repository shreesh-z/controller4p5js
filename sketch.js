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
let debug_mode = false;
let keymap_debug_mode = false; 
let show_framerate = true;
let mean_framerate = 0;
let framerate_averager = 0;
let framerate_max_count = 30;
let framerate_iterator = 0;
let deadzone = 0.08; // change according to your calibration

let paint, brush, paintbrush, layer_manager;

let dpad_mode_manager;
let show_active_layer_only = false;

let xdim = 1920;
let ydim = 1080;
let hud_height = 100;

let hud_image;

let erase_counter = 0;

let controller = new Controller();

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

	layer_manager = new LayerManager(xdim, ydim);
	paint = new Paint([BLEND, LIGHTEST, SOFT_LIGHT]);
	brush = new Brush(xdim, ydim);
	paintbrush = new PaintBrush(paint, brush);
	dpad_mode_manager = new DPadModeManager();

	paint.set_blendmode(layer_manager);
	background(layer_manager.get_bg_color());

	init_controller();
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

	controller.event_handler();

	if (show_active_layer_only){
		image(layer_manager.get_active_layer(), 0, 0);
	} else {
		image(layer_manager.get_full_sketch(), 0, 0);
	}

	if (dpad_mode_manager.layer_or_palette_mode == false){
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
	hud_image.text("BshSz Lock", 370, 85);

	// brightness set or not
	hud_image.fill(0,0,100);
	hud_image.textSize(18);
	hud_image.text(paint.is_bright_set, 500, 37);
	hud_image.textSize(20);
	hud_image.text("Brg Lock", 500, 85);

	// saturation set or not
	hud_image.fill(0,0,100);
	hud_image.textSize(18);
	hud_image.text(paint.is_sat_set, 600, 37);
	hud_image.textSize(20);
	hud_image.text("Sat Lock", 600, 85);

	hud_image.fill(0,0,100);
	hud_image.textSize(18);
	if (dpad_mode_manager.layer_or_palette_mode)
		hud_image.text("layer", 720, 37);
	else
		hud_image.text("palette", 720, 37);
	hud_image.textSize(20);
	hud_image.text("DpadMode", 720, 85);

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
	
	dpad_mode_manager.reset();
	layer_manager.reset();
	paint.reset();
	brush.reset();
	paintbrush.reset();
	paint.set_blendmode(layer_manager);

	console.log("Canvas erased. All modes cleared to default");
}

class DPadModeManager {
	constructor(){
		this.layer_or_palette_mode = false;
		this.dx_prev_val = 0;
		this.dy_prev_val = 0;
	}

	reset(){
		this.layer_or_palette_mode = false;
	}

	toggle_modes(){
		this.layer_or_palette_mode = !this.layer_or_palette_mode
	}

	DY(val){
		if (this.dy_prev_val != val){
			if (val == +1)
				this.DDown();
			else if (val == -1)
				this.DUp();
		}
		this.dy_prev_val = val;
	}

	DX(val){
		if (this.dx_prev_val != val){
			if (val == +1)
				this.DRight();
			else if (val == -1)
				this.DLeft();
		}
		this.dx_prev_val = val;
	}

	DUp(){
		if (this.layer_or_palette_mode == false)
			paint.add_current_hue_to_custom_palette();
		else{
			if (paintbrush.stroke_applied == false)
				layer_manager.go_up_one_layer();
		}
	}

	DDown(){
		if (this.layer_or_palette_mode == false){
			paintbrush.toggle_cursor_display();
			console.log("Showing current color palette gradient on cursor");
		} else {
			if (paintbrush.stroke_applied == false)
				layer_manager.go_down_one_layer();
		}
	}

	DRight(){
		if (this.layer_or_palette_mode == false)
			paint.toggle_custom_palette();
		else{
			if (paintbrush.stroke_applied == false)
				layer_manager.toggle_active_layer_transparency();
		}
	}

	DLeft(){
		if (this.layer_or_palette_mode == false){
			brush.cycle_brush_shape();
		} else {
			show_active_layer_only = !show_active_layer_only;
		}
	}
};

function init_controller(){

	// all key bindings

	controller.add_axis_function("LSX", function(val) {
		if (abs(val) > deadzone) {
			brush.moveX(val);
		}
	});

	controller.add_axis_function("LSY", function(val) {
		if (abs(val) > deadzone) {
			brush.moveY(val);
		}
	});
	controller.add_axis_function("RSX", function(val) {
		if (abs(val) > deadzone) {
			
			paint.update_HSX(val);
		}
	});
	controller.add_axis_function("RSY", function(val) {
		if (abs(val) > deadzone) {

			paint.update_HSY(val);
		}
	});
	controller.add_axis_function("RT", function(val) {
		paintbrush.draw_on_canvas(layer_manager, val, false);
	});
	controller.add_axis_function("LT", function(val) {
		paint.update_brightness(val, false);
	});

	// all button bindings

	controller.add_axis_function("DX", function(val) {
		dpad_mode_manager.DX(val);
	});
	controller.add_axis_function("DY", function(val) {
		dpad_mode_manager.DY(val);
	});
	controller.add_button_function("Y", function(val) {
		layer_manager.set_bg(paint);
	});
	controller.add_button_function("B", function(val) {
		if (paintbrush.stroke_applied == false)
			layer_manager.toggle_undo_pressed();
	});							
	controller.add_button_function("X", function(val) {
		paint.cycle_blendmode(layer_manager);
	});
	controller.add_button_function("A", function(val) {
		dpad_mode_manager.toggle_modes();
	});
	controller.add_button_function("DUp", function(val) {
		dpad_mode_manager.DUp();
	});
	controller.add_button_function("DRight", function(val) {
		dpad_mode_manager.DRight();
	});
	controller.add_button_function("DDown", function(val) {
		dpad_mode_manager.DDown();
	});
	controller.add_button_function("DLeft", function(val) {
		dpad_mode_manager.DLeft();
	});
	controller.add_button_function("RB", function(val) {
		brush.toggle_brush_size_lock();
	});
	controller.add_button_function("LB", function(val) {
		paint.toggle_set_brightness();
	});
	controller.add_button_function("Start", function(val) {
		layer_manager.download_sketch();
		console.log("Downloaded sketch");
	});
	controller.add_button_function("Select", function(val) {
		if(erase_counter == 3){
			reset_all();
		} else{
			console.log("Press the button " + (3-erase_counter) + " more times to erase canvas");
			erase_counter++;
		}
	});
	controller.add_button_function("RT", function(val) {
		paintbrush.draw_on_canvas(layer_manager, val, true);
	});
	controller.add_button_function("LT", function(val) {
		paint.update_brightness(val, true);
	});
	controller.add_button_function("LSB", function(val) {
		paint.toggle_set_saturation();
	});
	controller.add_button_function("RSB", function(val) {
		brush.cycle_max_brush_size();
	});
}

function cartesian_to_angle(x, y){
	let angle = (Math.atan2(y, x) * 180) / Math.PI;
	if (angle < 0) {
		angle = 360 + angle; // angle is in degrees, belonging to [0,360] cyclic
	}
	return angle;
};