class Brush {

	constructor(sketch_width, sketch_height){
		this.my_width = sketch_width;
		this.my_height = sketch_height;
		this.brush_shapes = ['line', 'ellipse'];
		this.move_speed = 7;

		this.reset();
	};

	reset(){
		this.posX = this.my_width/2;
		this.posY = this.my_height/2;
		this.prevPosX = this.my_width/2;
		this.prevPosY = this.my_height/2;
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
			this.prevPosX = this.posX;
			this.posX += this.velX;
		}
	}

	moveY(val){
		if ((this.posY <= 0 && val > 0) || (this.posY >= this.my_height && val < 0) || (this.posY > 0 && this.posY < this.my_height)) {
			this.velY = this.move_speed * val * (60/frameRate());
			this.prevPosY = this.posY;
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