/* eslint-disable camelcase */
/* from https://marioyepes.com/jest-setup-vanilla-javascript-project/
and
https://daily-dev-tips.com/posts/adding-jest-test-to-a-project/
/*

npm install --save-dev jest
package.json: set "scripts": {"test": "jest --coverage"},
npm test
*/

// importing the functions to test

// this:
// import remaining_seconds_to_readable_time from "./helper.js";
// throws SyntaxError: Cannot use import statement outside a module
// so using require instead
const { rel_seconds_to_readable_time } = require("./helper");

describe("Testing remaining_seconds_to_readable_time()", () => {
  test("1s", () => {
    expect(rel_seconds_to_readable_time(1)).toEqual("1s");
  });
  test("100s", () => {
    expect(rel_seconds_to_readable_time(100)).toEqual("1:40min");
  });
  test("0s", () => {
    expect(rel_seconds_to_readable_time(0)).toEqual("0s");
  });
  test("-1s", () => {
    expect(rel_seconds_to_readable_time(-1)).toEqual("0s");
  });
  test(">1h", () => {
    expect(rel_seconds_to_readable_time(4000)).toEqual("1:07h");
  });
  test(">1d", () => {
    expect(rel_seconds_to_readable_time(100000)).toEqual("1d 4h");
  });
});
