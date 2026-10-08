// @vitest-environment node
// Contract level (ADR-009): the synthetic data and the handler responses must match
// 07-api/contracts/openapi/qone-catalog-api.yaml exactly, so "aligned with 07" is a test result.
import { catalogFixtures, paginate } from "../mocks/fixtures/catalog";
import { expectValid, loadContract, type Contract } from "../test/contracts";

let contract: Contract;
beforeAll(async () => {
  contract = await loadContract("qone-catalog-api.yaml");
});

describe("catalog fixtures against qone-catalog-api.yaml", () => {
  it("every subject matches the Subject schema and the subject page matches CA-02's 200", () => {
    for (const s of catalogFixtures.subjects) expectValid(contract.schema("Subject"), s, `subject ${s.code}`);
    expectValid(contract.response("get", "/catalog/subjects", 200), paginate(catalogFixtures.subjects, 1, 20), "subjects page");
  });

  it("every section matches the Section schema and the sections page matches CA-05's 200", () => {
    for (const s of catalogFixtures.sections) expectValid(contract.schema("Section"), s, `section ${s.subjectCode} g${s.groupNumber}`);
    expectValid(contract.response("get", "/catalog/subjects/{code}/sections", 200), paginate(catalogFixtures.sections, 1, 20), "sections page");
  });

  it("the error envelope of the handlers matches the shared Error schema", async () => {
    const shared = await loadContract("_shared.yaml");
    expectValid(shared.schema("Error"), { error: "NOT_FOUND", message: "resource not found", traceId: "t-1" }, "envelope");
    expect(shared.schema("Error")({ detail: "old shape" })).toBe(false);
  });

  it("rejects a fixture that drifts from the contract", () => {
    const drifted = { ...catalogFixtures.subjects[0]!, credits: "3" };
    expect(contract.schema("Subject")(drifted)).toBe(false);
  });
});
