# Intervals-fn

> Enable manipulation on interval object.

[![Build Status](https://travis-ci.org/js-republic/intervals-fn.svg?branch=master)](https://travis-ci.org/js-republic/intervals-fn)
[![Maintainability](https://api.codeclimate.com/v1/badges/b6bcf985d873503648a0/maintainability)](https://codeclimate.com/github/js-republic/intervals-fn/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/b6bcf985d873503648a0/test_coverage)](https://codeclimate.com/github/js-republic/intervals-fn/test_coverage)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![npm version](https://badge.fury.io/js/intervals-fn.svg)](https://badge.fury.io/js/intervals-fn)

## What's in the box

All function are curried. Output keeps the input's structure and type. No input mutation.
### Unary operation
* Simplify
### Binary operations
* Intersection *
* Union *
* Subtraction *
### Manipulations
* Complement *
* Merge
* Split *
### Tests ([Allen's interval relations](https://en.wikipedia.org/wiki/Allen%27s_interval_algebra))
* After
* Before
* During
* Ending
* Equal
* Meeting
* Overlapping *
* Starting

## Accepted input
Functions marked with `*` both accept interval and Array/ReadonlyArray of interval

```typescript
{ start: number, end: number };

{ from: number, to: number };

[number, number];
```

## Installation

Intervals-fn is distributed on the latest channel:

```bash
$ npm install intervals-fn --save
```

## Advenced docs

Visit the homepage for an extensive API documentation:<br>
[https://js-republic.github.io/intervals-fn](https://js-republic.github.io/intervals-fn)

## TypeScript support
Intervals-fn includes typings for TypeScript.

## Contributing

Contributions are welcome and appreciated. Feel free to start an issue or create a pull requests.
This repo use [AngularJS's commit message convention](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines). You can use [cz-cli](https://github.com/commitizen/cz-cli) to format your commit.
