class Brush {
	// posX: 0,
	// posY: 0,
	// my_width: -1,
	// my_height: -1,
	// velX: 0,
	// velY: 0,
	// brush_size: 5,
	// min_brush_size: 5,
	// max_cursor_size: 40,
	// move_speed: 7,
	// brush_shapes: ['circle', 'ellipse'],
	// brush_shape_index: 0,
	// is_brush_size_set: false,

	constructor(sketch_width, sketch_height){
		this.my_width = sketch_width;
		this.my_height = sketch_height;

		this.posX = 0;
		this.posY = 0;
		this.my_width = -1;
		this.my_height = -1;
		this.velX = 0;
		this.velY = 0;
		this.brush_size = 5;
		this.min_brush_size = 5;
		this.max_brush_size = 40;
		this.move_speed = 7;
		this.brush_shapes = ['circle', 'ellipse'];
		this.brush_shape_index = 0;
		this.is_brush_size_set = false;
	};

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

	paintbrush_on_canvas(canvas, val, is_button){
		// change behavior depending on 6 axes mode or 4 axes mode

		if (is_button){
			// remap value to lie in [-1,1] instead of [0,1]
			val = 2*val.value - 1;
		}

		if(!this.is_brush_size_set){
			this.brush_size = this.min_brush_size + ((val+1)/2)*this.max_brush_size;
		}

		if (show_gradient_on_cursor == true)
			return;

		if(val != -1 && val != 0){

			if (brush_applied == false){
				// brush is being applied for the first time
				if (undo_checkpoint_pressed == false){
					save_for_undo();
				}
				brush_applied = true; 
			}

			let new_hue = my_hue;
			let new_brush_size = brush_size;

			canvas.noStroke();
			canvas.colorMode(HSB, 360, 100, 100, 100);
			canvas.fill(color(new_hue, my_sat, my_bright));
			if (brush_shape == 0)
				canvas.circle(posX, posY, new_brush_size);
			else if(brush_shape == 1){
				canvas.push();
				canvas.translate(posX, posY);
				angleMode(DEGREES);
				console.log(cartesian_to_angle(velX, velY));
				canvas.rotate(cartesian_to_angle(velX, velY));
				canvas.ellipse(0, 0, new_brush_size, new_brush_size/2);
				canvas.pop();
			}

			if(debug_mode){
				console.log("RT is being triggered");
			}
		} else {
			if (brush_applied == true){
				brush_applied = false;
			}
		}
	}
};