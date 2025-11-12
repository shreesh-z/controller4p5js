class Paint {
	// pass the list of blendmodes;
	// first element is default
	constructor(blendmode_list){
		this.reset();
		this.blendmode_selector_list = blendmode_list;
	}

	reset(){
		this.my_hue = 0;
		this.my_sat = 0;
		this.my_bright = 100;

		// indicator for where the analog stick is in HS space
		this.huesatX = 0;
		this.huesatY = 0;

		this.is_bright_set = false;
		this.is_sat_set = false;
		this.custom_palette_hues = [];
		this.are_custom_palette_hues_selected = false;

		this.blendmode_selector = 0;
	}

	cartesian_to_huesat(x, y) {
	
		let angle = cartesian_to_angle(x, y);
	
		if (this.custom_palette_hues.length > 0 && this.are_custom_palette_hues_selected){
	
			// if a custom gradient is selected
	
			if (this.custom_palette_hues.length == 1)
				return this.custom_palette_hues[0];
			else {
				let gradient_hue_index1 = floor(angle/(360/this.custom_palette_hues.length));
				let gradient_hue_index2 = (gradient_hue_index1+1) % this.custom_palette_hues.length;
	
				colorMode(HSB);
				let blend_color1 = color(this.custom_palette_hues[gradient_hue_index1], 100, 100);
				let blend_color2 = color(this.custom_palette_hues[gradient_hue_index2], 100, 100);
				let max_val_for_lerp = 360/this.custom_palette_hues.length;
				let lerp_ret = lerpColor(blend_color1, blend_color2, (angle % max_val_for_lerp)/max_val_for_lerp);
				return [hue(lerp_ret), saturation(lerp_ret)];
			}
		}
		
		// angle in degrees is how my_hue is processed anyways by default
		return [angle, -1];
	}

	__update_HS(){
		let new_sat;
		[this.my_hue, new_sat] = this.cartesian_to_huesat(this.huesatX, this.huesatY);

		if (!this.is_sat_set){
			if (new_sat != -1){
				this.my_sat = new_sat;
			}
			// console.log(this.my_hue, new_sat);
			new_sat = Math.sqrt((this.huesatX*this.huesatX + this.huesatY*this.huesatY));
			if (new_sat > 0.9){
				this.my_sat = 100;
			} else {
				this.my_sat = new_sat*100;
			}
		}
	}

	update_HSX(val){
		this.huesatX = val;
		this.__update_HS();
	}
	update_HSY(val){
		this.huesatY = val;
		this.__update_HS();
	}

	update_brightness(val, is_button){
		if (is_button){
			// remap value to lie in [-1,1] instead of [0,1]
			val = 2*val.value - 1;
		}

		if (!this.is_bright_set){
			if(val != 0){
				if (val != -1){
					this.my_bright = 50*(1-val);
				}
				else{
					this.my_bright = 100;
				}
			}
		}
	}

	set_blendmode(layer_manager){
		for (let i = 0; i < layer_manager.layers.length; i++){
			let canvas = layer_manager.layers[i];
			canvas.blendMode(this.blendmode_selector_list[this.blendmode_selector]);
		}
	}

	cycle_blendmode(layer_manager){
		this.blendmode_selector = (this.blendmode_selector+1) % this.blendmode_selector_list.length;
		this.set_blendmode(layer_manager);
	}

	add_current_hue_to_custom_palette(){
		if (this.custom_palette_hues.length < 4 && !this.are_custom_palette_hues_selected){
			this.custom_palette_hues.push(this.my_hue);
		}
	}

	toggle_custom_palette(){
		if (this.custom_palette_hues.length > 0){
			this.are_custom_palette_hues_selected = !this.are_custom_palette_hues_selected;
			if (!this.are_custom_palette_hues_selected){
				this.custom_palette_hues = [];
			}
		}
	}

	toggle_set_saturation(){
		this.is_sat_set = !this.is_sat_set;
	}

	toggle_set_brightness(){
		this.is_bright_set = !this.is_bright_set;
	}
};