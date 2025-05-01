class Brush {

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

	update_brush_size(val, is_button){
		if (is_button){
			// remap value to lie in [-1,1] instead of [0,1]
			val = 2*val.value - 1;
		}

		if(!this.is_brush_size_set){
			this.brush_size = this.min_brush_size + ((val+1)/2)*this.max_brush_size;
		}		
	}

	cycle_brush_shape(){
		this.brush_shape_index = (this.brush_shape_index + 1) % this.brush_shapes.length;
	}

	toggle_brush_size_lock(){
		this.is_brush_size_set = !this.is_brush_size_set
	}

	draw_on_canvas(canvas){
		canvas.noStroke();
		canvas.colorMode(HSB, 360, 100, 100, 100);
		canvas.fill(color(this.my_hue, this.my_sat, this.my_bright));
		if (this.brush_shapes[this.brush_shape_index] == 'circle'){
			canvas.circle(this.posX, this.posY, this.brush_size);
		}
		else if(this.brush_shapes[this.brush_shape_index] == 'ellipse'){
			canvas.push();
			canvas.translate(this.posX, this.posY);
			angleMode(DEGREES);
			// console.log(cartesian_to_angle(this.velX, this.velY));
			canvas.rotate(cartesian_to_angle(this.velX, this.velY));
			canvas.ellipse(0, 0, this.brush_size, this.brush_size/2);
			canvas.pop();
		}
	}
};