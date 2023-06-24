/* eslint-disable camelcase */
global.Tabulator = require("./lib/tabulator-5.4.min");
global.echarts = require("./lib/echarts-5.4.1.min");
document.body.innerHTML =
  '<div id ="div_table"></div><div id ="div_chart"></div>';

// eslint-disable-next-line no-unused-vars
const data = [
  {
    timestamp: 1677855852992,
    items: 0,
    remaining: 16,
  },
  {
    timestamp: 1677856017416,
    items: 6,
    remaining: 10,
    items_per_min: 2.1894613924974458,
    eta_ts: 1677856291456,
    eta_str: "3.3.2023 16:11:31",
  },
  {
    timestamp: 1677856215328,
    items: 8,
    remaining: 8,
    items_per_min: 0.6063300860988722,
    eta_ts: 1677857006976,
    eta_str: "3.3.2023 16:23:26",
  },
  {
    timestamp: 1677856352827,
    items: 10,
    remaining: 6,
    items_per_min: 0.8727336198808718,
    eta_ts: 1677856765324,
    eta_str: "3.3.2023 16:19:25",
  },
  {
    timestamp: 1677856433998,
    items: 12,
    remaining: 4,
    items_per_min: 1.4783604982074878,
    eta_ts: 1677856596340,
    eta_str: "3.3.2023 16:16:36",
  },
  {
    timestamp: 1677856479639,
    items: 14,
    remaining: 2,
    items_per_min: 2.629214960233124,
    eta_ts: 1677856525280,
    eta_str: "3.3.2023 16:15:25",
  },
  {
    timestamp: 1677856527322,
    items: 16,
    remaining: 0,
    items_per_min: 2.5166201790994696,
    eta_ts: 1677856527322,
    eta_str: "3.3.2023 16:15:27",
  },
];

describe("Table create and update", () => {
  // eslint-disable-next-line no-unused-vars
  const { table_create } = require("./helper-lib");
  const html_div_table = document.getElementById("div_table");
  test("table_create()", () => {
    table = table_create(html_div_table);
    expect(table).toBeDefined();
  });
});

// seems not to work in jest
// describe("Testing echarts", () => {
//   // eslint-disable-next-line no-unused-vars
//   const { chart_create, chart_update } = require("./helper-lib");
//   const html_div_chart = document.getElementById("div_chart");

//   test("create", () => {
//     chart = chart_create(html_div_chart);
//     expect(chart).toBeDefined();
//   });
// });
