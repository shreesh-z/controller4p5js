class MyIcon{
	constructor(x, y, w, h, text, text_size){
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.text = text;
		this.text_size = text_size;
	}
}

class BrushIcon extends MyIcon {
	constructor(x, y, w, h, text_size){
		super(x, y, w, h, "Brush", text_size);
	}

	draw(hud_image){
		hud_image.textAlign(CENTER, CENTER);
		hud_image.fill(0,0,100);
		hud_image.textSize(this.text_size);
		hud_image.text(this.text, this.x, this.y+35);
	}
}

class BlendmodeIcon extends MyIcon {
	constructor(x, y, w, h, text_size){
		super(x, y, w, h, "BlendMode", text_size);
	}

	draw(hud_image){
		hud_image.textAlign(CENTER, CENTER);
		hud_image.fill(0,0,100);
		hud_image.textSize(this.text_size);
		hud_image.text(this.text, this.x, this.y+35);
	}
}