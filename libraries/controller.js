// controller.js

let __controller_indices = [];
function __gamepadHandler(event_, connecting) {
	let gamepad = event_.gamepad;
	if (connecting) {
		print("Connecting to controller " + gamepad.index);
		__controller_indices[gamepad.index] = gamepad;
	} else {
		delete __controller_indices[gamepad.index];
	}
}

class Controller {
	constructor(debug = false){
		this.pressed = [];
		this.released = [];

		this.debug = debug;

		for (var i = 0; i < 17; i++) {
			this.released[i] = true;
			this.pressed[i] = false;
		}

		this.axis_name_to_functions = {};
		this.button_name_to_functions = {};

		this.axis_num_to_functions = {};
		this.button_num_to_functions = {};

		window.addEventListener("gamepadconnected", function(e) {
			__gamepadHandler(e, true);

			console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
				e.gamepad.index, e.gamepad.id,
				e.gamepad.buttons.length, e.gamepad.axes.length);
		});
		window.addEventListener("gamepaddisconnected", function(e) {
			console.log("Gamepad disconnected from index %d: %s",
				e.gamepad.index, e.gamepad.id);
			
			__gamepadHandler(e, false);
		});

		this.is_mapped = false;
	}

	__configure_mapping(mode = "firefox_linux", trigger_button_mode = false){
		
		if (this.is_mapped)
			return;

		if (mode.startsWith("firefox")) {
			this.axismap = {
				LSX: 0,
				LSY: 1,
				RSX: 2,
				RSY: 3,
				// LT: 4,
				// RT: 5
			};

			this.buttonmap = {
				A: 0,
				B: 1,
				X: 2,
				Y: 3,
				LB: 4,
				RB: 5,
				// LT: 6,
				// RT: 7,
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

			if (trigger_button_mode){
				this.buttonmap["LT"] = 6;
				this.buttonmap["RT"] = 7;
			} else {
				this.axismap["LT"] = 4;
				this.axismap["RT"] = 5;
			}

			if (mode.endsWith("linux")){
				// flip the two assignments only for linux
				this.buttonmap["X"] = 3;
				this.buttonmap["Y"] = 2;
			}

		} else if (mode.startsWith("chromium")) {
			this.axismap = {
				LSX: 0,
				LSY: 1,
				LT: 2,
				RSX: 3,
				RSY: 4,
				RT: 5,
				DX: 6,
				DY: 7
			};

			this.buttonmap = {
				A: 0,
				B: 1,
				X: 2,
				Y: 3,
				LB: 4,
				RB: 5,
				Select: 6,
				Start: 7,
				Menu: 8,
				LSB: 9,
				RSB: 10
			}
		}

		// transfer name-funct assignment to num-funct asignment

		let axis_keys = Object.keys(this.axismap);
		let button_keys = Object.keys(this.buttonmap);

		for (let i = 0; i < axis_keys.length; i++){
			let axis_name = axis_keys[i];

			if (this.axis_name_to_functions[axis_name] &&
						(this.axismap[axis_name] || this.axismap[axis_name] == 0)){

				this.axis_num_to_functions[this.axismap[axis_name]] =
					this.axis_name_to_functions[axis_name]
			}
		}
		for (let i = 0; i < button_keys.length; i++){
			let button_name = button_keys[i];

			if (this.button_name_to_functions[button_name] &&
						(this.buttonmap[button_name] || this.buttonmap[button_name] == 0)){

				this.button_num_to_functions[this.buttonmap[button_name]] =
					this.button_name_to_functions[button_name];
			}
		}

		this.is_mapped = true;
	}

	add_axis_function(axis_name, funct){
		this.axis_name_to_functions[axis_name] = funct;
	}

	add_button_function(btn_name, funct){
		this.button_name_to_functions[btn_name] = funct;
	}

	event_handler(){
		var gamepads = navigator.getGamepads();

		for (let i in __controller_indices) {

			let controller = gamepads[i];

			if (this.is_mapped == false){
				let mode = "";
				let trigger_button_mode = false;
				if (controller.axes.length > 6)
					mode += "chromium";
				else{
					mode += "firefox";

					if (controller.axes.length == 4){
						trigger_button_mode = true;
						mode += "_windows";
					} else {
						mode += "_linux";
					}
				}
				
				this.__configure_mapping(mode, trigger_button_mode);
			}

			if (controller.axes) {
				for (let ax = 0; ax < controller.axes.length; ax++) {
					let val = controller.axes[ax];
					let funct = this.axis_num_to_functions[ax];
					if (funct){
						funct(val);
					}
				}
			}

			if (controller.buttons) {
				for (let btn = 0; btn < controller.buttons.length; btn++) {
					let val = controller.buttons[btn];
					if (this.__buttonPressed(val, btn)){
						let funct = this.button_num_to_functions[btn];
						if (funct){
							funct(val);
							if (this.debug){
								console.log("Pressed ", btn);
							}
						}
					}
				}
			}
		}
	}

	__buttonPressed(b, index){
		let is_flipped_on = false;
		let condition;
		if (typeof(b) == "object")
			condition = b.pressed;
		// else condition = b == 1;
		else condition = b > 1; // try this later

		if(condition){
			if(this.pressed[index] == false){
				is_flipped_on = true;
				this.pressed[index] = true;
				this.released[index] = false;
			}
		} else {
			if(this.released[index] == false){
				this.released[index] = true;
				this.pressed[index] = false;
			}
		}
		return is_flipped_on;
	}
}