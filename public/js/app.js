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
      errored: false,
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
      const resp = await fetch(`/api/series?id=${sensorId}&limit=1`);
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

  render() {
    if (this.state.loading) {
      return h("h1", {}, "loading...");
    }

    if (this.state.errored) {
      console.log(this.state.error);
      return h("h1", {}, "wups");
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

render(h(Dashboard), document.body);
