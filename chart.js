/**
 * A bar chart. Required data format:
 * [ { name : x-axis-bar-label, value : N }, ...]
 *
 *  Sample use:
 *  var bargraph = d3.select('#bargraph')
 *    .append('svg')
 *    .chart('BarChart')
 *    .yFormat(d3.format("d"))
 *    .height(400)
 *    .width(800)
 *    .max(1.0);
 *  bargraph.draw(bardata);
 */
;
(function (d3) {
  d3.chart('BarChart', {

    initialize: function () {
      var chart = this;

      // chart margins to account for labels.
      // we may want to have setters for this.
      // not sure how necessary that is tbh.
      chart.margins = {
        top: 10,
        bottom: 15,
        left: 50,
        right: 0,
        padding: 10
      };

      // default chart ranges
      chart.x = d3.scale.linear();
      chart.y = d3.scale.linear();

      chart.base.classed('Barchart', true);

      // non data driven areas (as in not to be independatly drawn)
      chart.areas = {};

      // cache for selections that are layer bases.
      chart.layers = {};

      chart.areas.ylabels = chart.base.append('g')
        .classed('ylabels', true)
        .attr('width', chart.margins.left)
        .attr('transform',
          'translate(' + (chart.margins.left - 1) + ',' + (chart.margins.top + 1) + ')');

      chart.layers.bars = chart.base.append('g')
        .classed('bars', true)
        .attr('transform',
          'translate(' + chart.margins.left + ',' + (chart.margins.top + 1) + ')');

      chart.layers.xvalues = chart.base.append('g')
        .classed('xvalues', true)
        .attr('transform',
          'translate(' + chart.margins.left + ',' + (chart.margins.top + 1) + ')');

      chart.layers.xlabels = chart.base.append('g')
        .classed('xlabels', true)
        .attr('height', chart.margins.bottom);

      chart.on("change:width", function () {
        chart.x = d3.scale.linear() // adjust the x scale range
        .range([chart.margins.left, chart.w - chart.margins.right]);
        chart.base.attr('width', chart.w); // adjust the base width
        chart.x.range([0, this.w - chart.margins.left]);
      });

      chart.on("change:height", function () {
        chart.y = d3.scale.linear() // adjust the y scale
        .range([chart.h - chart.margins.bottom - chart.margins.top, 0]);
        chart.areas.ylabels
          .attr('height', chart.h - chart.margins.bottom - chart.margins.top - 1);
        chart.layers.bars
          .attr('height', chart.h - chart.margins.bottom - chart.margins.top);
        chart.layers.xlabels
          .attr('transform', 'translate(' + chart.margins.left + ',' +
            (chart.h - chart.margins.bottom + 1) + ')');
      });

      // make actual layers
      chart.layer('bars', chart.layers.bars, {
        // data format:
        // [ { name : x-axis-bar-label, value : N }, ...]
        dataBind: function (data) {

          chart.data = data;

          // how many bars?
          chart.bars = data.length;

          // compute box size
          chart.bar_width = (chart.w - chart.margins.left - ((chart.bars - 1) *
            chart.margins.padding)) / chart.bars;

          // adjust the x domain - the number of bars.
          chart.x.domain([0, chart.bars]);

          // adjust the y domain - find the max in the data.
          chart.datamax = chart.usermax ||
            d3.extent(data, function (d) {
              return d.value;
            })[1];

          chart.y.domain([0, chart.datamax]);

          // draw yaxis
          var yAxis = d3.svg.axis()
            .scale(chart.y)
            .orient('left')
            .ticks(4)
            .tickFormat(d3.format("d"));

          chart.areas.ylabels
            .call(yAxis);

          return this.selectAll('rect')
            .data(data, function (d) {
              return d.name;
            });
        },
        insert: function () {
          return this.append('rect')
            .classed('bar', true)
            .classed('highlight', function (d) {
              return d.highlight;
            });
        },

        events: {
          exit: function () {
            this.remove();
          }
        }
      });

      // a layer for the x text labels.
      chart.layer('xlabels', chart.layers.xlabels, {
        dataBind: function (data) {
          // first append a line to the top.
          this.append('line')
            .attr('x1', 0)
            .attr('x2', chart.w - chart.margins.left)
            .attr('y1', 0)
            .attr('y2', 0)
            .style('stroke', '#222')
            .style('stroke-width', '1')
            .style('shape-rendering', 'crispEdges');


          return this.selectAll('text')
            .data(data, function (d) {
              return d.name;
            });
        },
        insert: function () {
          return this.append('text')
            .classed('label', true)
            .attr('text-anchor', 'middle')
            .attr('x', function (d, i) {
              return chart.x(i) - 0.5 + chart.bar_width / 2;
            })
            .attr('dy', '1em')
            .text(function (d) {
              return d.name;
            });
        },
        events: {
          exit: function () {
            this.remove();
          }
        }
      });

      // a layer for the x text values.
      chart.layer('xvalues', chart.layers.xvalues, {
        dataBind: function (data) {
          return this.selectAll('rect')
            .data(data, function (d) {
              return d.name;
            });
        },
        insert: function () {
          return this.append('text')
            .style('fill', function (d) {
              if (d.value < 800) {
                return 'red'
              }
            })
            .style('font-weight', function (d) {
              if (d.value < 800) {
                return 'bold'
              }
            })
            .classed('label', true)
            .attr('text-anchor', 'middle')
            .attr('x', function (d, i) {
              return chart.x(i) + chart.bar_width / 2;
            })
            .attr('y', function (d, i) {
              return chart.h - chart.margins.bottom -
                chart.margins.top * 1.5 - chart.y(chart.datamax - d.value);
            })
            .text(function (d) {
              return d.value;
            });
        },
        events: {
          exit: function () {
            this.remove();
          }
        }
      });

      // on new/update data
      // render the bars.
      var onEnter = function () {
        this.attr('x', function (d, i) {
            return chart.x(i);
          })
          .attr('y', function (d) {
            return chart.h - chart.margins.bottom -
              chart.margins.top - chart.y(chart.datamax - d.value);
          })
          .attr('val', function (d) {
            return d.value;
          })
          .attr('width', chart.bar_width)
          .attr('height', function (d) {
            return chart.y(chart.datamax - d.value);
          });
      };

      chart.layer('bars').on('enter', onEnter);
      chart.layer('bars').on('update', onEnter);
    },

    // return or set the max of the data. otherwise
    // it will use the data max.
    max: function (datamax) {
      if (!arguments.length) {
        return this.usermax;
      }

      this.usermax = datamax;
      if (this.data) this.draw(this.data);

      return this;
    },

    width: function (newWidth) {
      if (!arguments.length) {
        return this.w;
      }
      // save new width
      this.w = newWidth;
      this.trigger("change:width");
      if (this.data) this.draw(this.data);

      return this;
    },

    height: function (newHeight) {
      if (!arguments.length) {
        return this.h;
      }

      // save new height
      this.h = newHeight;
      this.base.attr('height', this.h);

      this.trigger("change:height");
      if (this.data) this.draw(this.data);
      return this;
    }
  });

  var barchart = d3.select('#payment-chart')
    .append('svg')
    .chart('BarChart', {
      transform: function (data) {
        return data.map(function (d) {
          return {
            name: d.end,
            value: d.amount
          };
        });
      }
    })
    .height(200)
    .width(800)
    .max(2100);

  data = [{"amount":0,"end":"07-Dec","start":"01-Dec"},{"amount":0,"end":"14-Dec","start":"08-Dec"},{"amount":0,"end":"21-Dec","start":"15-Dec"},{"amount":0,"end":"28-Dec","start":"22-Dec"},{"amount":0,"end":"04-Jan","start":"29-Dec"},{"amount":0,"end":"11-Jan","start":"05-Jan"},{"amount":1600,"end":"18-Jan","start":"12-Jan"},{"amount":800,"end":"25-Jan","start":"19-Jan"},{"amount":1000,"end":"01-Feb","start":"26-Jan"},{"amount":500,"end":"08-Feb","start":"02-Feb"},{"amount":1000,"end":"15-Feb","start":"09-Feb"},{"amount":600,"end":"22-Feb","start":"16-Feb"},{"amount":400,"end":"01-Mar","start":"23-Feb"},{"amount":0,"end":"08-Mar","start":"02-Mar"},{"amount":0,"end":"15-Mar","start":"09-Mar"},{"amount":725,"end":"22-Mar","start":"16-Mar"},{"amount":200,"end":"29-Mar","start":"23-Mar"},{"amount":350,"end":"05-Apr","start":"30-Mar"},{"amount":800,"end":"12-Apr","start":"06-Apr"},{"amount":700,"end":"19-Apr","start":"13-Apr"},{"amount":400,"end":"26-Apr","start":"20-Apr"},{"amount":650,"end":"03-May","start":"27-Apr"},{"amount":0,"end":"10-May","start":"04-May"},{"amount":800,"end":"17-May","start":"11-May"},{"amount":550,"end":"24-May","start":"18-May"},{"amount":650,"end":"31-May","start":"25-May"},{"amount":750,"end":"07-Jun","start":"01-Jun"},{"amount":200,"end":"14-Jun","start":"08-Jun"},{"amount":400,"end":"21-Jun","start":"15-Jun"},{"amount":800,"end":"28-Jun","start":"22-Jun"},{"amount":350,"end":"05-Jul","start":"29-Jun"},{"amount":700,"end":"12-Jul","start":"06-Jul"},{"amount":0,"end":"19-Jul","start":"13-Jul"},{"amount":750,"end":"26-Jul","start":"20-Jul"},{"amount":0,"end":"02-Aug","start":"27-Jul"},{"amount":800,"end":"09-Aug","start":"03-Aug"},{"amount":800,"end":"16-Aug","start":"10-Aug"},{"amount":800,"end":"23-Aug","start":"17-Aug"},{"amount":0,"end":"30-Aug","start":"24-Aug"},{"amount":900,"end":"06-Sep","start":"31-Aug"},{"amount":900,"end":"13-Sep","start":"07-Sep"},{"amount":0,"end":"20-Sep","start":"14-Sep"},{"amount":0,"end":"27-Sep","start":"21-Sep"},{"amount":0,"end":"04-Oct","start":"28-Sep"},{"amount":1200,"end":"11-Oct","start":"05-Oct"},{"amount":0,"end":"18-Oct","start":"12-Oct"},{"amount":600,"end":"25-Oct","start":"19-Oct"},{"amount":300,"end":"01-Nov","start":"26-Oct"},{"amount":500,"end":"08-Nov","start":"02-Nov"},{"amount":0,"end":"15-Nov","start":"09-Nov"},{"amount":600,"end":"22-Nov","start":"16-Nov"},{"amount":1300,"end":"29-Nov","start":"23-Nov"},{"amount":0,"end":"06-Dec","start":"30-Nov"},{"amount":0,"end":"13-Dec","start":"07-Dec"},{"amount":0,"end":"20-Dec","start":"14-Dec"},{"amount":800,"end":"27-Dec","start":"21-Dec"},{"amount":800,"end":"03-Jan","start":"28-Dec"},{"amount":900,"end":"10-Jan","start":"04-Jan"},{"amount":0,"end":"17-Jan","start":"11-Jan"},{"amount":750,"end":"24-Jan","start":"18-Jan"},{"amount":1700,"end":"31-Jan","start":"25-Jan"},{"amount":0,"end":"07-Feb","start":"01-Feb"},{"amount":0,"end":"14-Feb","start":"08-Feb"},{"amount":1400,"end":"21-Feb","start":"15-Feb"},{"amount":0,"end":"28-Feb","start":"22-Feb"},{"amount":800,"end":"07-Mar","start":"01-Mar"},{"amount":0,"end":"14-Mar","start":"08-Mar"},{"amount":700,"end":"21-Mar","start":"15-Mar"},{"amount":700,"end":"28-Mar","start":"22-Mar"},{"amount":800,"end":"04-Apr","start":"29-Mar"},{"amount":800,"end":"11-Apr","start":"05-Apr"},{"amount":0,"end":"18-Apr","start":"12-Apr"},{"amount":0,"end":"25-Apr","start":"19-Apr"},{"amount":500,"end":"02-May","start":"26-Apr"},{"amount":1300,"end":"09-May","start":"03-May"},{"amount":0,"end":"16-May","start":"10-May"},{"amount":800,"end":"23-May","start":"17-May"},{"amount":500,"end":"30-May","start":"24-May"},{"amount":400,"end":"06-Jun","start":"31-May"},{"amount":400,"end":"13-Jun","start":"07-Jun"},{"amount":0,"end":"20-Jun","start":"14-Jun"},{"amount":0,"end":"27-Jun","start":"21-Jun"},{"amount":2000,"end":"04-Jul","start":"28-Jun"},{"amount":0,"end":"11-Jul","start":"05-Jul"}]

  numElems = 16
  barchart.draw(data.slice(data.length - numElems));
})(d3);