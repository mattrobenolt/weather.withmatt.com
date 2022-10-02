import {
  h,
  Component,
  render,
} from "https://unpkg.com/preact@10.11.0/dist/preact.module.js";

const { d3 } = window;

const sensors = {
  indoor: 1,
  outdoor: 2,
};

class Dashboard extends Component {
  render() {
    return h(
      "div",
      {},
      h(Sensor, { id: "indoor" }),
      h(Sensor, { id: "outdoor" })
    );
  }
}

class Sensor extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      errored: false,
      rendered: false,
    };
  }

  async componentDidMount() {
    await this.refresh();
    this.timer = setInterval(async () => {
      await this.refresh();
    }, 30000);
  }

  async refresh() {
    const sensorId = sensors[this.props.id];
    try {
      const resp = await fetch(`/api/series?id=${sensorId}&limit=720`);
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

  setChartRef(dom) {
    if (this.state.rendered) {
      return;
    }

    const margin = { top: 10, right: 30, bottom: 30, left: 60 },
      width = 460 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

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
        value: d.temp_f - 8,
      };
    });

    const x = d3
      .scaleTime()
      .domain(
        d3.extent(data, function (d) {
          return d.date;
        })
      )
      .range([0, width]);

    svg
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x));

    // Add Y axis
    const y = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(data, function (d) {
          return +d.value;
        }),
      ])
      .range([height, 0]);
    svg.append("g").call(d3.axisLeft(y));

    // Add the line
    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
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
      );

    this.setState({
      rendered: true,
    });
  }

  render() {
    if (this.state.loading) {
      return h("h1", {}, "loading...");
    }

    if (this.state.errored) {
      console.log(this.state.error);
      return h("h1", {}, "wups");
    }

    const latest = this.state.data.series[0];
    const date = new Date(parseInt(latest.data_datetime, 10) * 1000);

    return h(
      "div",
      {},
      h("h2", {}, this.props.id),
      h("p", {}, `Temp: ${latest.temp_f - 8}F`),
      h("p", {}, `AQI: ${latest.pm2_5_aqi}`),
      h("p", {}, `Date: ${date.toLocaleString()}`),
      h("div", {
        ref: this.setChartRef.bind(this),
        style: "width: 300px;",
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

render(h(Dashboard), document.body);
