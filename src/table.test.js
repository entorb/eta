/* eslint-disable camelcase */
global.Tabulator = require("./lib/tabulator-5.4.min");
// global.echarts = require("./lib/echarts-5.4.1.min");
document.body.innerHTML = '<div id ="div_table"></div>';
// <div id ="div_chart"></div>
// eslint-disable-next-line no-unused-vars
const data = [
  {
    timestamp: 1677554364952,
    items: 2,
    remaining: 8,
    items_per_min: 8.570204256534781,
    eta_ts: 1677554420960,
    eta_str: "28.2.2023 04:20:20",
  },
  {
    timestamp: 1677554357951,
    items: 1,
    remaining: 9,
  },
];

describe("Testing table creation", () => {
  // eslint-disable-next-line no-unused-vars
  const { table_create, table_update } = require("./helper");
  test("create", () => {
    table = table_create();
    expect(table).toBeDefined();
    total_speed_time_unit = "Minute";
    // table_update(data, total_speed_time_unit);
    // return expect(table_update()).rejects.toEqual(new Error());
  });
});
