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

	show_brush_on_hud(hud_image, x, y){
		hud_image.colorMode(HSB);
		hud_image.fill(color(this.paint.my_hue, this.paint.my_sat, this.paint.my_bright));

		let brush_size_temp = 50;

		if(this.brush.brush_shapes[this.brush.brush_shape_index] == 'circle'){
			hud_image.circle(x, y, brush_size_temp);
		} else {
			hud_image.ellipse(x, y, brush_size_temp, brush_size_temp/2);
		}
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

	draw_on_canvas(layer_manager, val, is_button){
		
		this.brush.update_brush_size(val, is_button);
	
		if (this.show_gradient_on_cursor == true)
			return;

		if (is_button){
			// remap value to lie in [-1,1] instead of [0,1]
			val = 2*val.value - 1;
		}
	
		if(val != -1 && val != 0){
			
			if (layer_manager.is_active_layer_transparent())
				return;

			if (this.stroke_applied == false) {
				// brush is being applied for the first time
				layer_manager.save_undo_layer_index();
				layer_manager.save_for_undo();
				layer_manager.undo_redo_selector = false;
				this.stroke_applied = true;
			}

			let canvas = layer_manager.get_active_layer();

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