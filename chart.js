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
(function (d3, microAjax) {
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

  microAjax('data.json', function(data) {
    numElems = 16;
    data = JSON.parse(data);
    barchart.draw(data.slice(data.length - numElems));
  })
})(d3, microAjax);