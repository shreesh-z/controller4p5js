// import {Brush} from "brush.js";
// import {Paint} from "paint.js";

import("./brush.js");
import("./paint.js");

class PaintBrush {
	constructor(paint, brush){
		this.paint = paint;
		this.brush = brush;

		this.min_cursor_size = 10;
		this.max_cursor_size = 40;

		this.reset();
	}

	reset(){
		this.brush_applied = false;
		this.show_gradient_on_cursor = false;
	}

	toggle_cursor_display(){
		this.show_gradient_on_cursor = !this.show_gradient_on_cursor;
	}

	show_current_paintbrush(canvas){
		// to only show the paintbrush, not to commit to it on main_sketch

		if (this.show_gradient_on_cursor){
			this.__draw_cursor();
		}

		canvas.colorMode(HSB);
		canvas.fill(color(my_hue, my_sat, my_bright));

		let cursor_size_temp = this.brush.brush_size > 0 ?
								this.brush.brush_size :
								(this.brush.max_brush_size-this.brush.min_brush_size)/2;
		
		if(this.brush.brush_shapes[this.brush.brush_shape_index] == 'circle'){
			canvas.circle(this.brush.posX, this.brush.posY, cursor_size_temp);
		} else if(this.brush.brush_shapes[this.brush.brush_shape_index] == 'ellipse') {
			canvas.push();
			canvas.translate(this.brush.posX, this.brush.posY);
			canvas.rotate(cartesian_to_angle(this.brush.velX, this.brush.velY));
			canvas.ellipse(0, 0, cursor_size_temp, cursor_size_temp/2);
			canvas.pop();
		}
	}

	draw_on_canvas(canvas, val, is_button){
		
		this.brush.update_brush_size(val, is_button);
	
		if (this.show_gradient_on_cursor == true)
			return;
	
		if(val != -1 && val != 0){
	
			if (this.brush_applied == false){
				// brush is being applied for the first time
				// TODO fix global variable access
				// if (undo_checkpoint_pressed == false){
				// }
				save_for_undo();
				this.brush_applied = true; 
			}

			this.brush.draw_on_canvas(canvas);
			
		} else {
			if (this.brush_applied == true){
				this.brush_applied = false;
			}
		}
	}
	
	__draw_cursor(canvas){
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
					
					let cursor_hue = this.paint.__cartesian_to_hue(xstep, ystep);
					let cursor_angle = this.paint.__cartesian_to_angle(xstep, ystep);
					let cursor_sat = (rad/this.max_cursor_size)*100;
					let cursor_bright = 100;
					
					let smallest_angle_diff = Infinity;
					
					// to be able to add current hue being pointed to;
					// so it shows up highlighted
					let custom_palette_hues_extended;
					if (!custom_palette_hues_selected)
						custom_palette_hues_extended = [...this.paint.custom_palette_hues];
					else custom_palette_hues_extended = [];
	
					if (this.paint.my_sat > 50)
						custom_palette_hues_extended.push(this.paint.__cartesian_to_angle(this.paint.huesatX, this.paint.huesatY));
	
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
					
					canvas.fill(color(cursor_hue, cursor_sat, cursor_bright));
					canvas.circle(x,y,2);
				}
			}
		}
	}
};