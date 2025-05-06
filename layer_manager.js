class LayerManager {
	constructor(xdim, ydim) {

		this.layers = [
			createGraphics(xdim, ydim),
			createGraphics(xdim, ydim),
			createGraphics(xdim, ydim),
			createGraphics(xdim, ydim)
		];

		this.layer_transparency = [];
		for (let i = 0; i < this.layers.length; i++)
			this.layer_transparency.push(false);

		this.active_layer_index = 0;
		this.main_sketch = this.layers[this.active_layer_index];
		this.undo_sketch = createGraphics(xdim, ydim);
		this.redo_sketch = createGraphics(xdim, ydim);
		this.save_sketch = createGraphics(xdim, ydim);

		this.saved_for_undo = false;
		this.undo_pressed = false;
		this.redo_pressed = false;
		// to flip between the undo/redo button's two states
		this.undo_redo_selector = false;

		this.bg_hue = 0;
		this.bg_sat = 0;
		this.bg_bright = 0;
	}

	reset(){
		// this.main_sketch.clear();
		for (let i = 0; i < this.layers.length; i++){
			this.layers[i].clear();
			this.layer_transparency[i] = false;
		}

		this.active_layer_index = 0;
		this.main_sketch = this.layers[this.active_layer_index]; 
		this.redo_sketch.clear();
		this.undo_sketch.clear();
		this.saved_for_undo = false;
		this.undo_pressed = false;
		this.redo_pressed = false;
		this.undo_redo_selector = false;
		this.bg_hue = 0;
		this.bg_sat = 0;
		this.bg_bright = 0;
	}

	save_for_undo(){
		this.saved_for_undo = true;
		this.redo_pressed = false;
		this.undo_pressed = false;
		this.undo_sketch.image(this.main_sketch, 0, 0);
	}

	do_undo(){
		if (this.saved_for_undo == false){
			// cannot undo if not saved for it beforehand
			// also cannot undo more than once
			return;
		}
	
		this.saved_for_undo = false;
		if (this.redo_pressed == true)
			this.redo_pressed = false;
	
		// save main sketch to reload for later
		this.redo_sketch.clear();
		this.redo_sketch.image(this.main_sketch, 0, 0);
	
		this.main_sketch.clear();
		this.main_sketch.image(this.undo_sketch, 0, 0);
	
		this.undo_pressed = true;
	}

	do_redo(){
		if (this.redo_pressed == false && this.undo_pressed == true){
			this.save_for_undo();
			this.main_sketch.clear();
			this.main_sketch.image(this.redo_sketch, 0, 0);
			this.redo_pressed = true;
		}
	}

	toggle_undo_pressed(){
		if (this.undo_redo_selector == false)
			this.do_undo();
		else
			this.do_redo();

		this.undo_redo_selector = !this.undo_redo_selector;
	}

	download_sketch(){
		saveCanvas(this.get_full_sketch());
	}

	set_bg(paint){
		this.bg_hue = paint.my_hue;
		this.bg_sat = paint.my_sat;
		this.bg_bright = paint.my_bright;
	}

	get_bg_color(){
		return color(this.bg_hue, this.bg_sat, this.bg_bright);
	}

	get_active_layer(){
		return this.main_sketch;
	}

	get_full_sketch(){
		this.save_sketch.clear();
		colorMode(HSB);
		this.save_sketch.background(color(this.bg_hue, this.bg_sat, this.bg_bright));	
		for (let i = this.layers.length-1; i >= 0; i--){
			if (this.layer_transparency[i] == false){
				this.save_sketch.image(this.layers[i], 0, 0)
			}
		}
		return this.save_sketch;
	}

	go_up_one_layer(){
		this.active_layer_index++;
		if (this.active_layer_index >= this.layers.length)
			this.active_layer_index = this.layers.length - 1;
		this.main_sketch = this.layers[this.active_layer_index];
	}

	go_down_one_layer(){
		this.active_layer_index--;
		if (this.active_layer_index < 0)
			this.active_layer_index = 0;
		this.main_sketch = this.layers[this.active_layer_index];
	}

	toggle_active_layer_transparency(){
		this.layer_transparency[this.active_layer_index] = !this.layer_transparency[this.active_layer_index];
	}

	get_active_layer_transparency(){
		return this.layer_transparency[this.active_layer_index];
	}
};