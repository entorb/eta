/* eslint-disable camelcase */
// from https://marioyepes.com/jest-setup-vanilla-javascript-project/
/*
npm install --save-dev jest
package.json: set "scripts": {"test": "jest"},
npm test
*/

import remaining_seconds_to_readable_time from "./helper.js";

describe("<Testing remaining_seconds_to_readable_time()>", () => {
  test("It should filter objects with `param` sec", () => {
    const input = [1];

    const expected = ["1s"];

    expect(remaining_seconds_to_readable_time(input)).toEqual(expected);
  });
});
