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

    self.checkedGauss = function(a, x, m, s, noise){
        var d = gauss(a, x, m, s, noise);
        d = Math.min(self.wellDepth, d);

        d = Math.round(d / self.gain);

        d = Math.min(2**self.bitDepth, d);

        return d;
    }

    self.data = []
    for (var i = -self.xRange / 2; i < self.xRange; i = i + 0.01){
        var dA = self.checkedGauss(self.iA, i, self.mA, self.sigma, self.noise);
        var dB = self.checkedGauss(self.iB, i, self.mB, self.sigma, self.noise);
        self.data.push({'x' : i, y : dA + dB })
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

    self.update = function(){

        // update the data
        for (var i = -self.xRange / 2; i < self.xRange; i = i + 0.01){
            var dA = self.checkedGauss(self.iA, i, self.mA, self.sigma, self.noise);
            var dB = self.checkedGauss(self.iB, i, self.mB, self.sigma, self.noise);
            self.data.push({'x' : i, y : dA + dB })
        }

        //update scaling data
        self.yScaleBig.domain([0, Math.min(self.iA/self.gain, self.wellDepth/self.gain) * 1.1 ]);
        self.yScaleSmall.domain([0, self.iB/self.gain * 1.1 ]);

        //update line data
        self.bigLine.attr('d',self.dataLineBig(self.data));
        self.smallLine.attr('d', self.dataLineSmall(self.data));
    }

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