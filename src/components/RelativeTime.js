import { Component } from "preact";

export default class RelativeTime extends Component {
  constructor() {
    super();
    this.state = { now: Date.now() };
  }

  componentDidMount() {
    const { refreshInterval = 5000 } = this.props;
    if (refreshInterval > 0) {
      this.timer = setInterval(() => {
        this.setState({ now: Date.now() });
      }, refreshInterval);
    }
  }
  componentWillUnmount() {
    if (this.timer) clearInterval(this.timer);
  }
  render({ value, ...props }, { now }) {
    const delta = now - value.getTime();
    const seconds = Math.abs(delta) / 1000;
    const minutes = seconds / 60;

    let words;

    if (delta <= 0) {
      words = "just now";
    } else if (seconds < 45) {
      words = "a few seconds ago";
    } else if (seconds < 90) {
      words = "a minute ago";
    } else if (minutes < 45) {
      words = `${Math.round(minutes)} minutes ago`;
    } else {
      words = "too long ago";
    }

    return (
      <time
        title={value.toLocaleString()}
        datetime={value.toISOString()}
        {...props}
      >
        {words}
      </time>
    );
  }
}
