/* eslint-disable camelcase */
/* eslint-disable require-jsdoc */
("use strict");

/**
 * helper functions for tabulator and echarts
 */

// Tabulator Table

function table_create(html_div_id) {
  const table = new Tabulator(html_div_id, {
    height: "100%",
    // data: data,
    layout: "fitDataStretch", // fit columns to width of table (optional)
    selectable: true,
    columns: [
      {
        title: "Date",
        field: "date_str",
        sorter: "datetime",
        headerSort: false,
        hozAlign: "center",
      }, // datetime sorting requires luxon.js library
      { title: "Items", field: "items", headerSort: false, hozAlign: "center" },
      {
        title: "Remaining",
        field: "remaining",
        headerSort: false,
        hozAlign: "center",
      },
      { title: "Speed", field: "speed", headerSort: false, hozAlign: "center" },
      { title: "ETA", field: "eta_str", headerSort: false, hozAlign: "left" },
    ],
  });
  return table;
}

function table_update(table, data, total_speed_time_unit) {
  console.log("fnc table_update()");
  // IDEA: Instead of using this function, the setting reactiveData:true and data:data could be used, but this would require the calculated columns to be present in the data array. This in turn would be problematic for changes of the unit speed...
  // IDEA: second function for just adding a row instead of recreating the table each time?
  const data_table = [];
  // BUG: this is only updated when the second time called
  table.updateColumnDefinition("speed", {
    title: "Items/" + total_speed_time_unit,
  });

  for (let i = 0; i < data.length; i++) {
    // bad: const row = data[i];
    // clone / copy the original row
    // from https://www.samanthaming.com/tidbits/70-3-ways-to-clone-objects/
    const row = Object.assign({}, data[i]);
    row["date_str"] = timestamp_to_datestr(row["timestamp"]);
    if ("items_per_min" in row) {
      row["speed"] = calc_speed_in_unit(
        row["items_per_min"],
        total_speed_time_unit
      );
    }
    data_table.push(row);
  }
  table.setData(data_table);
}

function table_delete_rows(table, data) {
  // const selectedRows = table.getSelectedRows();
  const selectedData = table.getSelectedData();
  if (selectedData.length === data.length) {
    // delete all via reset()
    reset();
    console.log("deleting all table data");
    return;
  }
  for (let i = 0; i < selectedData.length; i++) {
    const row = selectedData[i];
    const timestamp_to_delete = row["timestamp"];
    for (let j = data.length - 1; j >= 0; --j) {
      if (data[j]["timestamp"] === timestamp_to_delete) {
        data.splice(j, 1);
      }
    }
  }
  // TODO: sort not needed, but was too lazy to add another function
  data = sort_data(data);
  update_displays();
}
// eCharts

function chart_create(html_div_chart) {
  const chart = echarts.init(html_div_chart);
  // https://echarts.apache.org/en/option.html#color
  // const chart_colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];
  chart.setOption({
    // title: { text: 'Items per Minute' },
    tooltip: {},
    legend: {},
    grid: {
      // define margins
      containLabel: false,
      left: 50,
      bottom: 20,
      top: 30,
      right: 150,
    },
  });
  return chart;
}

function chart_update(
  chart,
  y2_series,
  total_speed_time_unit,
  total_items_per_min,
  total_timestamp_eta
) {
  console.log("fnc chart_update()");
  const chart_colors = ["#3ba272", "#5470c6", "#91cc75"];
  const data_echarts_items = [];
  const data_echarts_speed = [];
  const data_echarts_eta = [];

  // populate data arrays
  // TODO: only calc the ones need for the selected y2_series
  for (let i = 0; i < data.length; i++) {
    // clone, see update_table
    const row = Object.assign({}, data[i]);
    data_echarts_items.push([new Date(row["timestamp"]), row["items"]]);
    if ("items_per_min" in row) {
      data_echarts_speed.push([
        new Date(row["timestamp"]),
        calc_speed_in_unit(row["items_per_min"], total_speed_time_unit),
      ]);
    }
    if ("items_per_min" in row) {
      data_echarts_eta.push([
        new Date(row["timestamp"]),
        new Date(row["eta_ts"]),
      ]);
    }
  }

  // generate settings per Axis
  // TODO: only generate the ones need for the selected y2_series
  const yAxis_items = {
    name: "Items",
    position: "left",
    type: "value",
    nameTextStyle: { color: chart_colors[0] },
    axisLabel: {
      textStyle: {
        color: chart_colors[0],
      },
    },
  };

  const yAxis2_common = {
    position: "right",
    nameTextStyle: { color: chart_colors[1] },
    axisLabel: { textStyle: { color: chart_colors[1] } },
    splitLine: { show: false }, // no grid line
  };

  const yAxis2_speed = {
    ...yAxis2_common,
    ...{
      name: "Items/" + total_speed_time_unit,
      type: "value",
    },
  };

  const yAxis2_eta = {
    ...yAxis2_common,
    ...{
      name: "ETA",
      type: "time",
    },
  };

  const series_common = {
    type: "line",
    smooth: true,
    symbolSize: 10,
    silent: true,
    animation: false,
  };

  const series_items = {
    ...series_common,
    ...{
      yAxisIndex: 0,
      data: data_echarts_items,
      color: chart_colors[0],
      areaStyle: { opacity: 0.5 },
    },
  };

  const series_speed = {
    ...series_common,
    ...{
      yAxisIndex: 1,
      color: chart_colors[1],
      data: data_echarts_speed,
      markLine: {
        symbol: "none",
        label: { show: false },
        silent: true,
        animation: true,
        data: [{ yAxis: total_items_per_min }],
      },
    },
  };

  const series_eta = {
    ...series_common,
    ...{
      yAxisIndex: 1,
      color: chart_colors[1],
      data: data_echarts_eta,
      markLine: {
        symbol: "none",
        label: { show: false },
        silent: true,
        animation: true,
        data: [{ yAxis: new Date(total_timestamp_eta) }],
      },
    },
  };

  if (y2_series === "speed") {
    chart.setOption({
      series: [series_items, series_speed],
      xAxis: { type: "time" },
      yAxis: [yAxis_items, yAxis2_speed],
    });
  } else if (y2_series === "eta") {
    chart.setOption({
      series: [series_items, series_eta],
      xAxis: { type: "time" },
      yAxis: [yAxis_items, yAxis2_eta],
    });
  }
}

// Export functions, needed for Jest unittests
// Using this hack it works for both, jest and browser.
// from https://stackoverflow.com/questions/66349868/jest-unit-testing-module-export-error-in-browser-console
// var instead of const needed here
// eslint-disable-next-line no-var
var module = module || {};
module.exports = {
  table_create,
  table_update,
  table_delete_rows,
  chart_create,
  chart_update,
};
