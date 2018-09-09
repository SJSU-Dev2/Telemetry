Highcharts.setOptions(
{
    plotOptions:
    {
        area:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        arearange:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        areaspline:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        // areasplinerange:
        //     { animation: false, enableMouseTracking: false, stickyTracking: true, shadow: false, dataLabels:
        //     { style:
        //     { textShadow: false } } },
        // bar:
        // { animation: false, enableMouseTracking: false, stickyTracking: true, shadow: false, dataLabels:
        //     { style:
        //     { textShadow: false } } },
        boxplot:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        bubble:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        column:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        columnrange:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        errorbar:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        funnel:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        gauge:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        heatmap:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        line:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        pie:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        polygon:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        pyramid:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        scatter:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        series:
        {
            animation: false,
            enableMouseTracking: true,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        solidgauge:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        spline:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        treemap:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
        waterfall:
        {
            animation: false,
            enableMouseTracking: false,
            stickyTracking: true,
            shadow: false,
            dataLabels:
            {
                style:
                {
                    textShadow: false
                }
            }
        },
    },
    chart:
    {
        reflow: false,
        events:
        {
            redraw: function()
            {
                // console.log("highcharts redraw, rendering-done");
                // $('body').addClass('rendering-done');
            }
        },
        animation: false
    },
    tooltip:
    {
        enabled: true,
        animation: false
    },
    exporting:
    {
        enabled: false
    },
    credits:
    {
        enabled: false
    }
});

const GRAPHING_OPTIONS = {
  rangeSelector: {
    buttons: [{
      count: 10,
      type: 'second',
      text: '10s'
    }, {
      count: 20,
      type: 'second',
      text: '20s'
    }, {
      count: 30,
      type: 'second',
      text: '30s'
    }, {
      type: 'all',
      text: 'All'
    }],
    inputEnabled: false,
    selected: 0
  },

  title: {
    text: 'Live random data'
  },

  exporting: {
    enabled: true
  },

  series: [{
    name: 'Random data',
    data: (function() {
      // generate first set of data
      let data = [];
      let time = (new Date()).getTime();
      for (let i = -10; i <= 0; i += 1)
      {
        data.push([
          time + i * 1000,
          0
        ]);
      }
      return data;
    }())
  }]
};