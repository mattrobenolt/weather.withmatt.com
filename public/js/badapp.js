const {
  preact: { Component, h, render },
  d3,
} = window;

import { unixToDate, aqiScale } from "./utils.js";

import RelativeTime from "./components/RelativeTime.js";

const sensors = {
  indoor: 1,
  outdoor: 2,
};

class BadDashboard extends Component {
  render() {
    return h(
      "div",
      {},
      h(BadSensor, { id: "indoor" }),
      h(BadSensor, { id: "outdoor" })
    );
  }
}

class BadSensor extends Component {
  state = {
    loading: true,
    errored: false,
    rendered: false,
  };

  async componentDidMount() {
    await this.refresh();
    this.timer = setInterval(async () => {
      await this.refresh();
    }, 30000);
  }

  async refresh() {
    const sensorId = sensors[this.props.id];
    try {
      const resp = await fetch(
        `https://weather.withmatt.com/api/series?id=${sensorId}&limit=${
          (60 * 2) / 2
        }`
      );
      const data = await resp.json();
      this.setState({
        loading: false,
        data,
      });
    } catch (e) {
      this.setState({
        loading: false,
        errored: true,
        error: e,
      });
    }
  }

  setChartRef = (dom) => {
    if (this.state.rendered) {
      return;
    }

    const margin = { top: 0, right: 0, bottom: 20, left: 0 },
      width = 400 - margin.left - margin.right,
      height = 200 - margin.top - margin.bottom;

    const svg = d3
      .select(dom)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const data = this.state.data.series.map((d) => {
      return {
        date: new Date(parseInt(d.data_datetime, 10) * 1000),
        value: d.pm2_5_aqi,
      };
    });

    const max =
      d3.max(data, function (d) {
        return d.value;
      }) + 10;

    const x = d3
      .scaleTime()
      .domain(
        d3.extent(data, function (d) {
          return d.date;
        })
      )
      .range([0, width]);

    const xAxis = d3.axisBottom(x).tickSize(5).ticks(4, "%H:%M");
    svg.append("g").attr("transform", `translate(0, ${height})`).call(xAxis);

    const y = d3
      .scaleLinear()
      .domain([0, Math.max(300, max)])
      .range([height, 0]);

    // const yAxis = d3.axisLeft(y).tickSize(-width).ticks(5);
    // svg.append("g").call(yAxis);

    svg
      .append("linearGradient")
      .attr("id", "line-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0)
      .attr("y1", y(0))
      .attr("x2", 0)
      .attr("y2", y(300))
      .selectAll("stop")
      .data([
        { offset: "0%", color: "#009966" },
        { offset: "17%", color: "#ffde33" },
        { offset: "33%", color: "#ff9933" },
        { offset: "50%", color: "#cc0033" },
        { offset: "66%", color: "#660099" },
        { offset: "100%", color: "#7e0023" },
      ])
      .enter()
      .append("stop")
      .attr("offset", function (d) {
        return d.offset;
      })
      .attr("stop-color", function (d) {
        return d.color;
      });

    // Add the line
    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "url(#line-gradient)")
      .attr("stroke-width", 3)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr(
        "d",
        d3
          .line()
          .x(function (d) {
            return x(d.date);
          })
          .y(function (d) {
            return y(d.value);
          })
          .curve(d3.curveNatural)
      );

    this.setState({
      rendered: true,
    });
  };

  render() {
    if (this.state.loading) {
      return h("h1", {}, "loading...");
    }

    if (this.state.errored) {
      return h("h1", {}, "wups");
    }

    const latest = this.state.data.series[0];
    const date = unixToDate(latest.data_datetime);

    const { color, level, implications } = aqiScale(latest.pm2_5_aqi);

    return h(
      "div",
      {},
      h("h2", {}, this.props.id),
      h("p", {}, `Temp: ${latest.temp_f - 8}F`),
      h(
        "p",
        {
          style: {
            color: color,
            "font-weight": "bold",
          },
          title: implications,
        },
        `AQI: ${latest.pm2_5_aqi} (${level})`
      ),
      h("p", {}, h("small", {}, h(RelativeTime, { value: date }))),
      h("div", {
        ref: this.setChartRef,
        style: {
          width: 400,
        },
      }),
      h(
        "details",
        {},
        h("summary", {}, "Raw"),
        h("pre", {}, JSON.stringify(this.state.data, null, "  "))
      )
    );
  }
}

render(h(BadDashboard), document.body);
