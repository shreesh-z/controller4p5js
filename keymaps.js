let keymap, axismap;

let axismap_firefox = {
	LSX: 0,
	LSY: 1,
	RSX: 2,
	RSY: 3,
	LT: 4,
	RT: 5
};

let axismap_chromium = {
	LSX: 0,
	LSY: 1,
	LT: 2,
	RSX: 3,
	RSY: 4,
	RT: 5,
	DX: 6,
	DY: 7
};

let keymap_firefox = {
	A: 0,
	B: 1,
	X: 3,
	Y: 2,
	LB: 4,
	RB: 5,
	LT: 6, // use value as axis if axis_len == 4
	RT: 7, // use value as axis if axis_len == 4
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

let keymap_chromium = {
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

function drawGamepad() {
	let dx = 40;
	let dy = 100;
	let dj = 60;
	var gamepads = navigator.getGamepads();

	textSize(dx/2);
  
	for (let i in controllers) {
		push();
		translate(0, dy, 0);
		let controller = gamepads[i];
		if (controller.buttons) {
			for (let btn = 0; btn < controller.buttons.length; btn++) {
				let val = controller.buttons[btn];
				strokeWeight(2);
				stroke('white');
				if (val.pressed) {
					console.log(btn)
					fill('green');
					stroke('white');
				} else {
					fill('red');
					stroke('grey');
				}
				ellipse(btn * dx + dx, i * dx + dx, dx * 0.8);
				textAlign(CENTER, CENTER);
				fill('white');
				text(btn, btn * dx + dx, i * dx + dx);
			}
		}
		if (controller.axes) {
			let axes = controller.axes;
			for (let axis = 0; axis < axes.length; axis++) {
				let val = controller.axes[axis];
				translate(dj, 0);
				fill('grey');
				stroke('white');
				rect(0, dx * 2, dx, dx * 4);
				noStroke();
				fill('yellow');
				rect(0, (val * dx * 2) + 1 + dx * 4, dx, dx / 4);
				fill('white');
				textAlign(LEFT,BOTTOM);
				text(nf(val, 0, 2), 0, dx * 8);
			}
		}
		pop();
	}
  }