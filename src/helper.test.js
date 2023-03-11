/* eslint-disable require-jsdoc */
/* eslint-disable camelcase */

/* from https://marioyepes.com/jest-setup-vanilla-javascript-project/
and
https://daily-dev-tips.com/posts/adding-jest-test-to-a-project/

npm install --save-dev jest jest-environment-jsdom
package.json: set
"scripts": {"test": "jest --coverage"},
"jest": { "testEnvironment": "jsdom" }
npm test

jsdom provides window.localStorage
*/

// importing the functions to test

// this:
// import remaining_seconds_to_readable_time from "./helper.js";
// throws SyntaxError: Cannot use import statement outside a module
// so using require instead

describe("zeroPad()", () => {
  const { zeroPad } = require("./helper");
  const cases = [
    // arg1, arg2, expectedResult
    [1, 2, "01"],
    [6, 3, "006"],
  ];
  test.each(cases)(
    "given '%p', '%p' it shall return %p",
    (arg1, arg2, expectedResult) => {
      expect(zeroPad(arg1, arg2)).toEqual(expectedResult);
    }
  );
});

describe("remaining_seconds_to_readable_time()", () => {
  const { rel_seconds_to_readable_time } = require("./helper");
  const cases = [
    // arg1, arg2, expectedResult
    [1, "1s"],
    [0, "0s"],
    [-1, "0s"],
    [100, "1:40min"],
    [4000, "1:07h"],
    [100000, "1d 4h"],
  ];
  test.each(cases)(
    "given '%p' as argument it shall return %p",
    (arg1, expectedResult) => {
      expect(rel_seconds_to_readable_time(arg1)).toEqual(expectedResult);
    }
  );
});

describe("calc_speed_in_unit()", () => {
  const { calc_speed_in_unit } = require("./helper");
  const cases = [
    // arg1, arg2, expectedResult
    [1234.567, "Minute", 1234.6],
    [0.1, "Hour", 6.0],
    [0.1, "Day", 144.0],
    [0.1, "xxx", 0],
  ];
  test.each(cases)(
    "given '%p', '%p' it shall return %p",
    (arg1, arg2, expectedResult) => {
      expect(calc_speed_in_unit(arg1, arg2)).toEqual(expectedResult);
    }
  );
});

describe("timestamp_to_datestr()", () => {
  const { timestamp_to_datestr } = require("./helper");
  test("Minute", () => {
    expect(timestamp_to_datestr(1677320618262)).toEqual("25.2.2023 11:23:38");
  });
});

describe("calc_remaining_items()", () => {
  const { calc_remaining_items } = require("./helper");
  test("target=0", () => {
    expect(calc_remaining_items(30, 0)).toEqual(30);
  });
  test("target>0", () => {
    expect(calc_remaining_items(30, 100)).toEqual(70);
  });
});

describe("isNumeric()", () => {
  // from https://dev.to/bgord/simplify-repetitive-jest-test-cases-with-test-each-310m
  const { isNumeric } = require("./helper");
  const cases = [
    ["10", true],
    ["asdf", false],
    ["1.1", true],
    ["1,1", false],
    ["10x", false],
    [" 10 ", true], // this is surprising
  ];
  test.each(cases)(
    "given '%p' as argument, returns %p",
    (firstArg, expectedResult) => {
      const result = isNumeric(firstArg);
      expect(result).toEqual(expectedResult);
    }
  );
});

describe("linreg()", () => {
  const { linreg } = require("./helper");
  const x = [
    1677464718648, 1677464720558, 1677464721845, 1677464723069, 1677464724581,
    1677464725877, 1677464727326, 1677464728429, 1677464729925, 1677465568115,
  ];
  const y = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  test("test 1", () => {
    expect(linreg(x, y)).toEqual([-0.00000605439111290888, 10156032.530841943]);
  });
});

describe("calc_row_new_delta() count-up", () => {
  const { calc_row_new_delta } = require("./helper");
  const row_last = { items: 1, remaining: 9, timestamp: 1677554357951 };
  test("normal case", () => {
    const row_new = { items: 2, remaining: 8, timestamp: 1677554364952 };
    expect(calc_row_new_delta(row_new, row_last)["eta_ts"]).toBeGreaterThan(
      row_new["timestamp"]
    );
    expect(calc_row_new_delta(row_new, row_last)).toEqual({
      items: 2,
      remaining: 8,
      timestamp: 1677554364952,
      eta_str: "28.2.2023 04:20:20",
      eta_ts: 1677554420960,
      items_per_min: 8.570204256534781,
    });
  });
  test("same timestamp", () => {
    const row_new = { items: 2, remaining: 8, timestamp: 1677554357951 };
    expect(calc_row_new_delta(row_new, row_last)).toEqual({
      items: 2,
      remaining: 8,
      timestamp: 1677554357951,
    });
  });
});

describe("calc_row_new_delta() count-down", () => {
  const { calc_row_new_delta } = require("./helper");
  const row_last = { items: 9, remaining: 9, timestamp: 1677554357951 };
  test("normal case", () => {
    const row_new = { items: 8, remaining: 8, timestamp: 1677554364952 };
    expect(calc_row_new_delta(row_new, row_last)["eta_ts"]).toBeGreaterThan(
      row_new["timestamp"]
    );
    expect(calc_row_new_delta(row_new, row_last)).toEqual({
      items: 8,
      remaining: 8,
      timestamp: 1677554364952,
      eta_str: "28.2.2023 04:20:20",
      eta_ts: 1677554420960,
      items_per_min: 8.570204256534781,
    });
  });
  test("same timestamp", () => {
    const row_new = { items: 8, remaining: 8, timestamp: 1677554357951 };
    expect(calc_row_new_delta(row_new, row_last)).toEqual({
      items: 8,
      remaining: 8,
      timestamp: 1677554357951,
    });
  });
});

describe("sort_data()", () => {
  const { sort_data } = require("./helper");
  data = [
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
  test("normal case", () => {
    expect(sort_data(data)).toEqual([
      {
        timestamp: 1677554357951,
        items: 1,
        remaining: 9,
      },
      {
        timestamp: 1677554364952,
        items: 2,
        remaining: 8,
        items_per_min: 8.570204256534781,
        eta_ts: 1677554420960,
        eta_str: "28.2.2023 04:20:20",
      },
    ]);
  });
  test("empty data", () => {
    expect(sort_data([])).toEqual([]);
  });
});

describe("read_html_input_number()", () => {
  const { read_html_input_number } = require("./helper");
  document.body.innerHTML =
    '<input id="input_items" type="text" inputmode="numeric" pattern="[0-9]*"></input>';
  const html_input_items = document.getElementById("input_items");
  const cases = [
    ["1", 1],
    ["", 0],
    ["asdf", 0],
    ["1.1", 1.1],
    ["1,1", 1.1],
  ];
  test.each(cases)("given '%p' it shall return %p", (arg1, expectedResult) => {
    html_input_items.value = arg1;
    expect(read_html_input_number(html_input_items)).toEqual(expectedResult);
  });
});
