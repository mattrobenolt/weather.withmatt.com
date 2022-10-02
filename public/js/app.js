import {
  h,
  Component,
  render,
} from "https://unpkg.com/preact@10.11.0/dist/preact.module.js";

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
    };
  }

  async componentDidMount() {
    const sensorId = sensors[this.props.id];
    const resp = await fetch(`/api/series?id=${sensorId}`);
    const data = await resp.json();
    this.setState({
      loading: false,
      data,
    });
  }

  render() {
    if (this.state.loading) {
      return h("h1", {}, "loading...");
    }

    const latest = this.state.data.series[0];

    return h(
      "div",
      {},
      h("h2", {}, this.props.id),
      h("p", {}, `Temp: ${latest.temp_f - 8}F`),
      h("p", {}, `AQI: ${latest.pm2_5_aqi}`),
      h(
        "details",
        {},
        h("summary", {}, "Raw"),
        h("pre", {}, JSON.stringify(this.state.data, null, "  "))
      )
    );
  }
}

render(h(Dashboard, null), document.body);
