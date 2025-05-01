import "brush.js"
import "paint.js"

class PaintBrush {
	constructor(paint, brush){
		this.paint = paint;
		this.brush = brush;

		this.brush_applied = false;
		this.show_gradient_on_cursor = false;
		this.min_cursor_size = 10;
		this.max_cursor_size = 40;
	}

	paintbrush_on_canvas(canvas, val, is_button){
		
		this.brush.update_brush_size(val, is_button);
	
		if (this.show_gradient_on_cursor == true)
			return;
	
		if(val != -1 && val != 0){
	
			if (this.brush_applied == false){
				// brush is being applied for the first time
				// TODO fix global variable access
				if (undo_checkpoint_pressed == false){
					save_for_undo();
				}
				this.brush_applied = true; 
			}

			this.brush.draw_on_canvas(canvas);
			
		} else {
			if (this.brush_applied == true){
				this.brush_applied = false;
			}
		}
	}
	
	draw_cursor(canvas){
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
					let gradient_hues_extended;
					if (!gradient_hues_selected)
						gradient_hues_extended = [...this.paint.gradient_hues];
					else gradient_hues_extended = [];
	
					if (this.paint.my_sat > 50)
						gradient_hues_extended.push(this.paint.__cartesian_to_angle(this.paint.huesatX, this.paint.huesatY));
	
					if (gradient_hues_extended.length > 0){
						for (var i = 0; i < gradient_hues_extended.length; i++){
							let angle_diff;
							angle_diff = gradient_hues_extended[i] - cursor_angle;
							
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
					
					if (!canvas){
						fill(color(cursor_hue, cursor_sat, cursor_bright));
						circle(x,y,2);
					} else {
						canvas.fill(color(cursor_hue, cursor_sat, cursor_bright));
						canvas.circle(x,y,2);
					}
				}
			}
		}
	}
};