export function unixToDate(value) {
  return new Date(parseInt(value, 10) * 1000);
}

export function aqiScale(value) {
  if (value <= 50) {
    return {
      color: "#009966",
      level: "Good",
      implications:
        "Air quality is considered satisfactory, and air pollution poses little or no risk",
      caution: null,
    };
  }

  if (value <= 100) {
    return {
      color: "#ffde33",
      level: "Moderate",
      implications:
        "Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.",
      caution:
        "Active children and adults, and people with respiratory disease, such as asthma, should limit prolonged outdoor exertion.",
    };
  }

  if (value <= 150) {
    return {
      color: "#ff9933",
      level: "Unhealthy for Sensitive Groups",
      implications:
        "Members of sensitive groups may experience health effects. The general public is not likely to be affected.",
      caution:
        "Active children and adults, and people with respiratory disease, such as asthma, should limit prolonged outdoor exertion.",
    };
  }

  if (value <= 200) {
    return {
      color: "#cc0033",
      level: "Unhealthy",
      implications:
        "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects",
      caution:
        "Active children and adults, and people with respiratory disease, such as asthma, should avoid prolonged outdoor exertion; everyone else, especially children, should limit prolonged outdoor exertion",
    };
  }

  if (value <= 300) {
    return {
      color: "#660099",
      level: "Very Unhealthy",
      implications:
        "Health warnings of emergency conditions. The entire population is more likely to be affected.",
      caution:
        "Active children and adults, and people with respiratory disease, such as asthma, should avoid all outdoor exertion; everyone else, especially children, should limit outdoor exertion.",
    };
  }

  return {
    color: "#7e0023",
    level: "Hazardous",
    implications:
      "Health alert: everyone may experience more serious health effects",
    caution: "Everyone should avoid all outdoor exertion",
  };
}
