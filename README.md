# Procedural Texture Generator
The Procedural Texture Generator is a JavaScript tool for creating textures and patterns on HTML5 canvas. It lets you make all sorts of designs using code, like making clouds or funky geometric shapes. You can tweak colors, shapes, and other settings to get just the look you want. Then, you can easily draw your creations right onto a canvas on your webpage. It's perfect for making interactive web apps, digital art, or experimenting with cool visual effects!
[Learn more about procedural textures.](https://andrasweb.com/blog/graphic-design/procedural-textures-adding-depth-and-realism-to-your-designs/)
## Usage

index.html

```html
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<script type="text/javascript" src="ptg.js"></script>
</head>
<body>
	<canvas id="c" width="100" height="100"></canvas>
	<script type="text/javascript" src="main.js"></script>
</body>
</html>
```

main.js

```javascript
const canvas = document.getElementById('c');
const tg = new PTG.ProceduralTextureGenerator(canvas);
tg.set([{
	program:'sinX',
	blendMode:'add',
	tint:[0,1,0],
	frequency:0.031,
	offset:0
},{
	program:'sinY',
	blendMode:'multiply',
	tint:[0,1,0],
	frequency:0.031,
	offset:0
},{
	program:'twirl',
	tint:[1,1,1],
	radius:100,
	strength:100,
	position:[128,128]
}]);
```

[See it in the demo site.](https://texture-generator.andrasweb.com/twirl-1)

## Parameters
### Programs
- Tint
- Sinus X
- Sinus Y
- OR
- XOR
- Checker Board
- Rectangle
- Circle
- Noise
- Fractal Noise
- Cellular Noise
- Voronoi Noise
- Cellular Fractal
- Voronoi Fractal
- Transform
- Sine Distort
- Twirl
