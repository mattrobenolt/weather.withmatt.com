import {
  h,
  Component,
  render,
} from "https://unpkg.com/preact@10.11.0/dist/preact.module.js";

class Dashboard extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
    };
  }

  async componentDidMount() {
    const resp = await fetch(`/api/series?id=${this.props.id}`);
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
      h("p", {}, `Temp: ${latest.temp_f - 8}F`),
      h("p", {}, `AQI: ${latest.pm2_5_aqi}`),
      h("pre", {}, JSON.stringify(this.state.data, null, "  "))
    );
  }
}

render(h(Dashboard, { id: 2 }), document.body);
