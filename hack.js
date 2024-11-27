const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { monochrome } = require('./dither');
const { nanoid } = require('nanoid');

const filePath = path.join(__dirname, 'image.png');

// Load the image
loadImage(filePath).then((image) => {
  // Create a canvas with the same dimensions as the image
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  // Draw the image onto the canvas
  ctx.drawImage(image, 0, 0);

  const WIDTH = 128;
  const HEIGHT = Math.floor(WIDTH * (canvas.height / canvas.width));
  console.log({ WIDTH, HEIGHT });
  const scaledCanvas = createCanvas(WIDTH, HEIGHT);
  const scaledCtx = scaledCanvas.getContext('2d');
  scaledCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, WIDTH, HEIGHT);

  const imageData = scaledCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height);

  const newImageData = monochrome(imageData, 128, 'zzbayer');
  
  scaledCtx.putImageData( newImageData, 0, 0);

  const out = fs.createWriteStream(path.join(__dirname, 'output.png'));
  const stream = scaledCanvas.createPNGStream();
  stream.pipe(out);
  out.on('finish', () => {
    console.log('The PNG file was created.');
  });

  const TOTAL_GENERATIONS = Math.random() * 50 + 25;
  let generations = [];
  let generation = [];

  for (let colIndex = 0; colIndex < newImageData.width; colIndex++) {
    let row = [];
    for (let rowIndex = 0; rowIndex < newImageData.height; rowIndex++) {

      const pixelIndex = (rowIndex * newImageData.width + colIndex) * 4;
      const pixel = newImageData.data[pixelIndex];
      const transparent = newImageData.data[pixelIndex+3];
      row.push(pixel == 0 && transparent != 0 ? 1 : 0);    
    }
    generation.push(row);
  }

  generations.push(generation);

  for (let generationIndex = 1; generationIndex < TOTAL_GENERATIONS; generationIndex++) {
    const lastGeneration = generations[generationIndex - 1];
    const newGeneration = [];
    for (let rowIndex = 0; rowIndex < newImageData.height; rowIndex++) {
      let row = [];
      for (let colIndex = 0; colIndex < newImageData.width; colIndex++) {
        let neighbors = 0;
        if (rowIndex > 0) {
          neighbors += lastGeneration[rowIndex - 1]?.[colIndex] || 0;
        }
        if (rowIndex < newImageData.height - 1) {
          neighbors += lastGeneration[rowIndex + 1]?.[colIndex] || 0;
        }
        if (colIndex > 0) {
          neighbors += lastGeneration[rowIndex]?.[colIndex - 1] || 0;
        }
        if (colIndex < newImageData.width - 1) {
          neighbors += lastGeneration[rowIndex]?.[colIndex + 1] || 0;
        }
        row.push(neighbors % 2);
      }
      newGeneration.push(row);
    }
    generations.push(newGeneration);
  }

  const id = nanoid(8);

  fs.writeFileSync(path.join(__dirname,'outputs', `${id}-${nanoid()}.json`),
    JSON.stringify({
      id, generationCount: generations.length, generations: generations.reverse()
    }, null, 2)
  );

}).catch((err) => {
  console.error('Failed to load the image:', err);
});
