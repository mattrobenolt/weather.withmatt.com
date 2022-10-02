const {
  preact: { Component, h },
} = window;

export default class RelativeTime extends Component {
  render({ value, ...props }) {
    const delta = Date.now() - value.getTime();
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

    return h(
      "time",
      {
        title: value.toLocaleString(),
        datetime: value.toISOString(),
        ...props,
      },
      words
    );
  }
}
