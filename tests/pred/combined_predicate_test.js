/**
 * @license
 * Copyright 2014 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
goog.setTestOnly();
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.op');
goog.require('lf.proc.Relation');
goog.require('lf.testing.hrSchemaSampleData');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'CombinedPredicate');


/** @type {!hr.db.Database} */
var db;


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!hr.db.schema.Job} */
var j;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance(
      undefined, /* opt_volatile */ true).then(function(database) {
    db = database;
    e = db.getSchema().getEmployee();
    j = db.getSchema().getJob();
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests the setComplement() method for the case of an AND predicate.
 */
function testSetComplement_And() {
  var predicate = lf.op.and(e.salary.gte(200), e.salary.lte(600));
  var expectedSalariesOriginal = [200, 300, 400, 500, 600];
  var expectedSalariesComplement = [0, 100, 700];

  checkSetComplement(
      predicate, 8, expectedSalariesOriginal, expectedSalariesComplement);
}


/**
 * Tests the setComplement() method for the case of an OR predicate.
 */
function testSetComplement_Or() {
  var predicate = lf.op.or(e.salary.lte(200), e.salary.gte(600));
  var expectedSalariesOriginal = [0, 100, 200, 600, 700];
  var expectedSalariesComplement = [300, 400, 500];

  checkSetComplement(
      predicate, 8, expectedSalariesOriginal, expectedSalariesComplement);
}


/**
 * Performs a series of tests for the setComplement() method.
 * @param {!lf.Predicate} predicate The combined predicate to be tested.
 * @param {number} sampleRowCount The number of sample Employee rows to be used
 *     during testing.
 * @param {!Array.<number>} expectedSalariesOriginal The expected salaries
 *     returned by the original predicate.
 * @param {!Array.<number>} expectedSalariesComplement The expected salaries
 *     returned by the complement predicate.
 */
function checkSetComplement(
    predicate, sampleRowCount, expectedSalariesOriginal,
    expectedSalariesComplement) {
  var extractSalaries = function(relation) {
    return relation.entries.map(function(entry) {
      return entry.row.getSalary();
    });
  };

  var inputRelation = lf.proc.Relation.fromRows(
      getSampleRows(sampleRowCount), [e.getName()]);

  var assertOriginal = function() {
    var outputRelation = predicate.eval(inputRelation);
    assertArrayEquals(
        expectedSalariesOriginal,
        extractSalaries(outputRelation));
  };

  var assertComplement = function() {
    var outputRelation = predicate.eval(inputRelation);
    assertArrayEquals(
        expectedSalariesComplement,
        extractSalaries(outputRelation));
  };

  // Testing the original predicate.
  assertOriginal();

  // Testing the complement predicate.
  predicate.setComplement(true);
  assertComplement();

  // Testing going from the complement predicate back to the original.
  predicate.setComplement(false);
  assertOriginal();

  // Testing that calling setComplement() twice with the same value leaves the
  // predicate in a consistent state.
  predicate.setComplement(true);
  predicate.setComplement(true);
  assertComplement();
}


/**
 * Generates sample emolyee data to be used for tests.
 * @param {number} rowCount The number of sample rows to be generated.
 * @return {!Array.<!lf.Row>}
 */
function getSampleRows(rowCount) {
  var employees = new Array(rowCount);
  for (var i = 0; i < rowCount; i++) {
    var employee = lf.testing.hrSchemaSampleData.generateSampleEmployeeData(db);
    employee.
        setId(i.toString()).
        setSalary(100 * i);
    employees[i] = employee;
  }

  return employees;
}
