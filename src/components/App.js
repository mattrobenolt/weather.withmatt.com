import { Component } from "preact";
import RelativeTime from "./RelativeTime";
import { unixToDate, aqiScale } from "../utils";
import * as d3 from "d3";

const TempOffset = -8;

export default class App extends Component {
  render() {
    return (
      <div>
        <Row>
          <SensorSummaryLive
            sensor={{
              id: 2,
              name: "outdoor",
            }}
          />
          <SensorSparklineLive
            sensor={{
              id: 2,
              name: "outdoor",
            }}
            hours={4}
          />
        </Row>
        <Row>
          <SensorSummaryLive
            sensor={{
              id: 1,
              name: "indoor",
            }}
          />
          <SensorSparklineLive
            sensor={{
              id: 1,
              name: "indoor",
            }}
            hours={4}
          />
        </Row>
        <Row>
          <SensorSparklineLive
            sensor={{
              id: 2,
              name: "outdoor",
            }}
            width={300}
            hours={24}
          />
        </Row>
        <Row>
          <SensorSparklineLive
            sensor={{
              id: 1,
              name: "indoor",
            }}
            width={300}
            hours={24}
          />
        </Row>
      </div>
    );
  }
}

function Row({ style, children }) {
  return (
    <div
      style={{
        display: "flex",
        flexFlow: "row",
        justifyContent: "center",
        margin: 0,
        padding: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

async function fetchSeries(sensorId, limit = 1) {
  const resp = await fetch(
    `https://weather.withmatt.com/api/series?id=${sensorId}&limit=${limit}`
  );
  const data = resp.json();
  return data;
}

class SensorSummaryLive extends Component {
  state = { loading: true, errored: false };

  async componentDidMount() {
    await this.refresh();
    const { refreshInterval = 30000 } = this.props;
    if (refreshInterval > 0) {
      setInterval(async () => {
        await this.refresh();
      }, refreshInterval);
    }
  }

  async refresh() {
    const { id } = this.props.sensor;
    try {
      const data = await fetchSeries(id, 1);
      this.setState({
        loading: false,
        errored: false,
        data: data.series[0],
      });
    } catch (e) {
      this.setState({
        loading: false,
        errored: true,
        error: e,
      });
    }
  }

  render({ sensor, ...props }, { data, ...state }) {
    if (state.errored) {
      return (
        <Box
          style={{
            backgroundColor: "#f00",
          }}
        />
      );
    }
    return <SensorSummary name={sensor.name} data={data} {...props} />;
  }
}

function SensorSummary({ name, data }) {
  if (!data) {
    return (
      <SensorTile
        style={{
          backgroundImage: "linear-gradient(0deg, #ddd, #efefef)",
        }}
      />
    );
  }

  const { data_datetime, temp_f, pm2_5_aqi } = data;
  const date = unixToDate(data_datetime);
  const { color, level, implications } = aqiScale(pm2_5_aqi);

  return (
    <SensorTile
      style={{
        color: "white",
        backgroundImage: `linear-gradient(0deg, ${color}FF 0%, ${color}00 75%)`,
        backgroundColor: "#113",
      }}
    >
      <Row>
        <Box
          style={{
            fontSize: "70px",
            fontWeight: 800,
            textShadow: "3px 3px #222",
          }}
        >
          {temp_f + TempOffset}&deg;
        </Box>
      </Row>
      <Row style={{ paddingBottom: 20 }}>
        <Box>{pm2_5_aqi} AQI</Box>
      </Row>
      <Row>
        <Box style={{ paddingRight: 10 }}>
          <small
            style={{
              fontWeight: 800,
              fontSize: "9px",
            }}
          >
            {name}
          </small>
        </Box>
        <Box>
          <small
            style={{
              fontWeight: 800,
              fontSize: "9px",
            }}
          >
            <RelativeTime value={date} />
          </small>
        </Box>
      </Row>
    </SensorTile>
  );
}

function SensorTile({ style, children, ...props }) {
  const boxWidth = 170;
  return (
    <Box
      style={{
        width: boxWidth,
        height: 170,
        margin: 5,
        borderRadius: 15,
        padding: 10,
        ...style,
      }}
      {...props}
    >
      {children}
    </Box>
  );
}

class SensorSparklineLive extends Component {
  state = { loading: true };
  async componentDidMount() {
    const { id } = this.props.sensor;
    const { hours = 6 } = this.props;
    try {
      const data = await fetchSeries(id, (hours * 60) / 2);
      this.setState({
        loading: false,
        aqiData: data.series.map(function (d) {
          return {
            date: unixToDate(d.data_datetime),
            value: d.pm2_5_aqi,
          };
        }),
        tempData: data.series.map(function (d) {
          return {
            date: unixToDate(d.data_datetime),
            value: d.temp_f + TempOffset,
          };
        }),
      });
    } catch (e) {}
  }
  render({ sensor, width = 150, ...props }, { loading, aqiData, tempData }) {
    if (loading) {
      return (
        <SensorTile
          style={{
            backgroundImage: "linear-gradient(0deg, #ddd, #efefef)",
            width,
          }}
        />
      );
    }
    return (
      <SensorTile
        style={{
          backgroundColor: "#111",
          width,
        }}
      >
        <TempSparkline
          data={tempData}
          width={width}
          height={50}
          style={{
            marginBottom: 40,
          }}
          {...props}
        />
        <AQISparkline data={aqiData} width={width} height={50} {...props} />
      </SensorTile>
    );
  }
}

class AQISparkline extends Component {
  setChartRef = (dom) => {
    const margin = 5,
      width = this.props.width - margin - margin,
      height = this.props.height - margin - margin;

    const svg = d3
      .select(dom)
      .append("svg")
      .attr("width", width + margin + margin)
      .attr("height", height + margin + margin)
      .append("g")
      .attr("transform", `translate(${margin},${margin})`);

    const { data } = this.props;

    const max = d3.max(data, function (d) {
      return d.value;
    });

    const x = d3
      .scaleTime()
      .domain(
        d3.extent(data, function (d) {
          return d.date;
        })
      )
      .range([0, width]);

    const y = d3.scaleLinear().domain([0, max]).range([height, 0]);

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
          .curve(d3.curveBasis)
      );
  };

  render({ style, width, height }) {
    return (
      <div
        ref={this.setChartRef}
        style={{
          width: width,
          height: height,
          ...style,
        }}
      />
    );
  }
}

class TempSparkline extends Component {
  setChartRef = (dom) => {
    const margin = 5,
      width = this.props.width - margin - margin,
      height = this.props.height - margin - margin;

    const svg = d3
      .select(dom)
      .append("svg")
      .attr("width", width + margin + margin)
      .attr("height", height + margin + margin)
      .append("g")
      .attr("transform", `translate(${margin},${margin})`);

    const { data } = this.props;

    var max = d3.max(data, function (d) {
      return d.value;
    });

    var min = d3.min(data, function (d) {
      return d.value;
    });

    if (Math.abs(max - min) < 5) {
      max += 2;
      min -= 2;
    }

    const x = d3
      .scaleTime()
      .domain(
        d3.extent(data, function (d) {
          return d.date;
        })
      )
      .range([0, width]);

    const y = d3.scaleLinear().domain([min, max]).range([height, 0]);

    // const yAxis = d3.axisLeft(y).tickSize(-width).ticks(5);
    // svg.append("g").call(yAxis);

    svg
      .append("linearGradient")
      .attr("id", "line-gradient2")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0)
      .attr("y1", y(0))
      .attr("x2", 0)
      .attr("y2", y(100))
      .selectAll("stop")
      .data([
        { offset: "0%", color: "#00f" },
        { offset: "50%", color: "#fff" },
        { offset: "100%", color: "#f00" },
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
      .attr("stroke", "url(#line-gradient2)")
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
          .curve(d3.curveBasis)
      );
  };

  render({ style, width, height }) {
    return (
      <div
        ref={this.setChartRef}
        style={{
          width: width,
          height: height,
          ...style,
        }}
      />
    );
  }
}

function Box({ style, children, ...props }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        flexFlow: "column",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
