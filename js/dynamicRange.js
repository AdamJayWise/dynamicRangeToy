console.log('Dynamic Range Toy, (C) 2020 Adam Wise');

/* this is going to be a toy to show the value of having dynamic range, both in terms of well depth, noise, signal and bit depth */

/* I will use d3.js to generate the graph and manage selections

There will be two graphs per dynamic range object - one for a 'big signal view', and one for a 'small signal view'

There will be slider controls for:
-noise
-ADC bit depth
-pixel well depth
-signal A value
-signal B value

make code as reusable as possible in anticipation of a spectroscopy simulator

Creating a dynamicRangeViz object should make two SVGs, one for largesignal and one for smallsignal

*/

// Standard Normal variate using Box-Muller transform.
function randBM() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

function gauss(a, x, m, s, noise){
    return a * Math.exp( -0.5 * ( ((x-m)/s)**2) ) + (noise * randBM());
}


function dynamicRangeViz(paramObj = {}){
    var self = this;

    // defaults
    self.parentElementSelector = 'body';
    self.svgWidth = 200;
    self.svgHeight = 200;
    self.svgMargin = 5;
    
    // model parameters
    self.noise = 20; // noise in electrons RMS
    self.wellDepth = 15000; // pixel well depth in electrons
    self.bitDepth = 16; // bit depth for adc
    self.gain  = 1; // conversion gain in electrons / adc
    self.iA = 50000; // height of 1st peak
    self.mA = -2; // x position of 1st peak
    self.iB = 1000; // height of 2nd peak
    self.mB = 2; // x position of 2nd peak
    self.xRange = 10; // width of x axis
    self.sigma = 0.5; // linewidth for peaks

    // copy values from parameter object to self, overwriting defaults
    Object.keys(paramObj).forEach(function(k){self[k]=paramObj[k]})

    self.parentElement = d3.select(self.parentElementSelector);

    self.limit = function(d){
        d = Math.min(self.wellDepth, d);
        d = Math.floor(d / self.gain);
        d = Math.min(2**self.bitDepth, d);
        return d
    }

    self.data = []
    for (var i = -self.xRange / 2; i < self.xRange; i = i + 0.01){
        var dA = gauss(self.iA, i, self.mA, self.sigma, self.noise);
        var dB = gauss(self.iB, i, self.mB, self.sigma, self.noise);
        self.data.push({'x' : i, y : self.limit(dA + dB) })
    }

    // scales for the graphs
    self.xScaleBig = d3.scaleLinear().domain([-self.xRange/2, self.xRange/2]).range([0, self.svgWidth]);
    self.yScaleBig = d3.scaleLinear().domain([0, Math.min(self.iA/self.gain, self.wellDepth/self.gain) * 1.1 ]).range([self.svgHeight, 0]);
    
    self.xScaleSmall = d3.scaleLinear().domain([-self.xRange/2, self.xRange/2]).range([0, self.svgWidth]);
    self.yScaleSmall = d3.scaleLinear().domain([0, self.iB/self.gain * 1.1 ]).range([self.svgHeight, 0]);

    // line generator for the graph
    self.dataLineBig = d3.line().x(d=>self.xScaleBig(d.x)).y(d=>self.yScaleBig(d.y));
    self.dataLineSmall = d3.line().x(d=>self.xScaleSmall(d.x)).y(d=>self.yScaleSmall(d.y));

    // svgs for display
    self.bigSvg = d3.select(self.parentElementSelector).append('svg')
        .attr('height', self.svgHeight)
        .attr('width', self.svgWidth)
        .style('display','inline')
        .style('margin', self.svgMargin)

    self.smallSvg = d3.select(self.parentElementSelector).append('svg')
        .attr('height', self.svgHeight)
        .attr('width', self.svgWidth)
        .style('display','inline')
        .style('margin', self.svgMargin)

    // append lines to svgs and style them
    self.bigLine = self.bigSvg.append('path')
                    .attr('d',self.dataLineBig(self.data))
                    .attr('fill','none')
                    .attr('stroke','black')
                    .attr('stroke-width','1.5px')
      
    self.smallLine = self.smallSvg.append('path')
                    .attr('d',self.dataLineSmall(self.data))
                    .attr('fill','none')
                    .attr('stroke','black')
                    .attr('stroke-width','1.5px')

    // add limit lines for well depth and adc saturation
    self.adcLine = self.bigSvg.append('line');
    self.adcLine.attr('x1',0)
        .attr('x2', self.svgWidth)
        .attr('y1', self.yScaleBig(2**self.bitDepth))
        .attr('y2', self.yScaleBig(2**self.bitDepth))
        .attr('stroke','blue')
    
    self.adcLineText = self.bigSvg.append('text');
        self.adcLineText.text('ADC Saturation')
            .attr('x', 85)
            .attr('y', self.yScaleBig(2**self.bitDepth) + 10)
            .style('fill','blue')
            .classed('lineLabel', true)

    self.satLine = self.bigSvg.append('line');
    self.satLine.attr('x1',0)
        .attr('x2', self.svgWidth)
        .attr('y1', self.yScaleBig(self.wellDepth / self.gain))
        .attr('y2', self.yScaleBig(self.wellDepth / self.gain))
        .attr('stroke','red')

    self.satLineText = self.bigSvg.append('text');
    self.satLineText.text('Well Depth')
        .attr('x', 150)
        .attr('y', self.yScaleBig(self.wellDepth / self.gain) + 10)
        .style('fill','red')
        .classed('lineLabel', true)



    self.update = function(){

        // update the data
        self.data = [];
        for (var i = -self.xRange / 2; i < self.xRange; i = i + 0.01){
            var dA = gauss(self.iA, i, self.mA, self.sigma, self.noise);
            var dB = gauss(self.iB, i, self.mB, self.sigma, self.noise);
            self.data.push({'x' : i, y : self.limit(dA + dB) })
        }

        //update scaling data
        self.yScaleBig.domain([0, Math.min(self.iA/self.gain, self.wellDepth/self.gain) * 1.1 ]);
        self.yScaleSmall.domain([0, self.iB/self.gain * 1.1 ]);

        //update limit lines and labels
        self.satLine
            .attr('y1', self.yScaleBig(self.wellDepth / self.gain))
            .attr('y2', self.yScaleBig(self.wellDepth / self.gain))
        
        self.adcLine
            .attr('y1', self.yScaleBig(2**self.bitDepth))
            .attr('y2', self.yScaleBig(2**self.bitDepth))

        self.adcLineText.attr('y', self.yScaleBig(2**self.bitDepth) + 10)
        self.satLineText.attr('y', self.yScaleBig(self.wellDepth / self.gain) + 10)

        //update line data
        self.bigLine.attr('d','')
        self.bigLine.attr('d',self.dataLineBig(self.data));
        self.smallLine.attr('d', self.dataLineSmall(self.data));
    }

    // make a slider factory

    self.makeSlider = function(sliderConfigObj = {}){
        var sliderDiv = self.parentElement.append('div');
        var sliderLabel = sliderDiv.append('div').classed('sliderLabelDiv',true).text(sliderConfigObj['displayName'])
        var newSlider = sliderDiv.append('input').attr('type','range');
        newSlider.attr('min', sliderConfigObj['minVal']);
        newSlider.attr('max', sliderConfigObj['maxVal']);
        newSlider.attr('value', sliderConfigObj['initVal']);

        var displayDiv = sliderDiv.append('div').classed('sliderDisplay', true).text(sliderConfigObj['initVal']);

        newSlider.on('input', function(){
            self[sliderConfigObj['param']] = this.value;
            self.update();
            displayDiv.text(this.value);
            console.log(this.value)
        })
    }

    // add control sliders

    var bitDepthSlider = self.makeSlider({
        param : 'bitDepth',
        displayName : 'Bit Depth',
        minVal : 0,
        maxVal : 16,
        stepVal : 1,
        initVal : self.bitDepth
    })

    var noiseDepthSlider = self.makeSlider({
        param : 'noise',
        displayName : 'Noise, e RMS',
        minVal : 0,
        maxVal : 100,
        stepVal : 1,
        initVal : self.noise
    })

    var WellDepthSlider = self.makeSlider({
        param : 'wellDepth',
        displayName : 'Well Depth, e',
        minVal : 100,
        maxVal : 150000,
        stepVal : 1,
        initVal : self.wellDepth,
    })

    var gainSlider = self.makeSlider({
        param : 'gain',
        displayName : 'ADC Gain, e/ADU',
        minVal : 0.1,
        maxVal : 200,
        stepVal : 1,
        initVal : self.gain,
    })

    var iASlider = self.makeSlider({
        param : 'iA',
        displayName : 'Peak A, e',
        minVal : 1000,
        maxVal : 150000,
        stepVal : 1,
        initVal : self.iA,
    })

    var iBSlider = self.makeSlider({
        param : 'iB',
        displayName : 'Peak B, e',
        minVal : 10,
        maxVal : 5000,
        stepVal : 1,
        initVal : self.iB,
    })

    

}

// add one display
var divA = d3.select('body').append('div').attr('id','divA').classed('vizDiv', true)

var paramObjA = {
    'parentElementSelector':'#divA',
    'noise' : 0,
}

var a = new dynamicRangeViz( paramObjA );

// add another display
var divB = d3.select('body').append('div').attr('id','divB').classed('vizDiv', true)

var paramObjB = {
                    'iA' : 150000,
                    'wellDepth' : 150000,
                    'parentElementSelector':'#divB',
                    'noise' : 0,
                    'gain' : 40,
                    'bitDepth' : 12,
                }

var b = new dynamicRangeViz(paramObjB);