const fs = require("fs");
const async = require("async");
const parseGeoraster = require("georaster");
const { createCanvas } = require('canvas')
const width = 1306;
const height = 606;
const canvas = createCanvas(width, height)
const ctx = canvas.getContext('2d');

function drawPixel(context, x, y, value) {
  if(value === 1) {
    context.fillStyle = '#0f0';
  } else if(value === -1) {
    context.fillStyle = '#f00';
  } else {
    context.fillStyle = '#fff';
  }
  context.fillRect(x, y, 1, 1);
}

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
var csvWriter = createCsvWriter({
  path: 'out.csv',
  header: [
    {id: 'lat', title: 'Lat'},
    {id: 'lon', title: 'Lon'},
    {id: 'value', title: 'Value'},
    {id: 'xy', title: 'x,y'},
  ]
});

async.parallel({
  v2016: function(callback){
      fs.readFile("2016.tiff", (err, data) => {
        parseGeoraster(data).then(georaster => {
          console.log('georaster: ', georaster);
          callback(null, {values: georaster.values[0], ph: georaster.pixelHeight, pw: georaster.pixelWidth, latStart: georaster.ymax, lonStart: georaster.xmin});
        });
      });
  },
  v2021: function(callback){
    fs.readFile("2021.tiff", (err, data) => {
      parseGeoraster(data).then(georaster => {
        callback(null, georaster.values[0]);
      });
    });
  }},
function(err, results) {
  var v2016 = results.v2016.values;
  var v2021 = results.v2021;
  var m = {ph: results.v2016.ph, pw: results.v2016.pw, latStart: results.v2016.latStart, lonStart: results.v2016.lonStart}
  console.log('m: ', m);

  var desiredData = [];
  for(var h = 0; h < v2016.length; h++) {
    var w_arr = v2016[h];
    for(var w = 0; w < w_arr.length; w++) {
      var cell2016 = w_arr[w];
      var cell2021 = v2021[h][w];

      if(cell2016 == 104 && cell2021 != 104) { // disappeared
        desiredData.push({lat: h * m.ph + m.latStart, lon: w * m.pw + m.lonStart, value: -1, xy: `${w}, ${h}`});
        drawPixel(ctx, w,h, -1)
      } else if(cell2016 != 104 && cell2021 == 104) { // appeared
        desiredData.push({lat: h * m.ph + m.latStart, lon: w * m.pw + m.lonStart, value: 1, xy: `${w}, ${h}`});
        drawPixel(ctx, w,h, 1)
      } else {
        drawPixel(ctx, w,h, 0)
      }
    }
  }
  csvWriter
		.writeRecords(desiredData)
		.then(()=> console.log('The CSV file was written successfully'));

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("visual.png", buffer);
});