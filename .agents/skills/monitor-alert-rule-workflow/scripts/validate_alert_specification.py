#!/usr/bin/env python3
"""Validate one alert block in a phase-specific laboratory specification."""

from __future__ import annotations

import argparse
import json
import re
import tempfile
from pathlib import Path


REQUIRED_SECTIONS = (
    "Business objective",
    "Authority and existing evidence",
    "Trigger and non-trigger conditions",
    "Thresholds, units, timing, and tolerances",
    "Persistence and duplicate prevention",
    "Correction and automatic resolution",
    "Administrative closure",
    "Recurrence and correlation",
    "Routing expectations",
    "Scenario matrix",
    "Automated test references",
    "Required source mappings",
    "Blockers and deferred connected tests",
    "Approval record",
)

SCENARIO_COLUMNS = (
    "Scenario ID",
    "Starting state",
    "Laboratory action",
    "Expected source state",
    "Expected standalone result",
    "Deferred connected evidence",
)

ALERT_CODE = re.compile(r"[A-E][0-9]{2}")
BLOCK_HEADING = re.compile(r"^## ([A-E][0-9]{2})\s+[—-]\s+.+$", re.MULTILINE)
SECTION_HEADING = re.compile(r"^### (.+?)\s*$", re.MULTILINE)
HTML_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)


class ValidationError(RuntimeError):
    pass


def alert_block(text: str, code: str) -> str:
    matches = list(BLOCK_HEADING.finditer(text))
    selected = [index for index, match in enumerate(matches) if match.group(1) == code]
    if len(selected) != 1:
        raise ValidationError(f"expected exactly one {code} alert block, found {len(selected)}")
    index = selected[0]
    start = matches[index].start()
    end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
    return text[start:end]


def section_bodies(block: str) -> dict[str, str]:
    matches = list(SECTION_HEADING.finditer(block))
    bodies: dict[str, str] = {}
    for index, match in enumerate(matches):
        name = match.group(1)
        if name in bodies:
            raise ValidationError(f"duplicate section: {name}")
        end = matches[index + 1].start() if index + 1 < len(matches) else len(block)
        bodies[name] = block[match.end():end]
    return bodies


def substantive(body: str) -> bool:
    without_comments = HTML_COMMENT.sub("", body)
    return bool(without_comments.strip())


def scenario_ids(matrix: str, code: str) -> list[str]:
    rows = [line.strip() for line in matrix.splitlines() if line.strip().startswith("|")]
    parsed_rows = [tuple(cell.strip().strip("`") for cell in row.strip("|").split("|")) for row in rows]
    if len(parsed_rows) < 3 or parsed_rows[0] != SCENARIO_COLUMNS:
        raise ValidationError("Scenario matrix columns do not match the reusable template")
    if len(parsed_rows[1]) != len(SCENARIO_COLUMNS) or not all(
        re.fullmatch(r":?-+:?", cell) for cell in parsed_rows[1]
    ):
        raise ValidationError("Scenario matrix separator row is invalid")
    if any(len(row) != len(SCENARIO_COLUMNS) for row in parsed_rows[2:]):
        raise ValidationError("Scenario matrix row has the wrong number of columns")
    data_rows = [row[0] for row in parsed_rows[2:]]
    if not data_rows:
        raise ValidationError("Scenario matrix has no scenario rows")
    expected = re.compile(rf"{re.escape(code)}-[0-9]{{2}}")
    invalid = [identifier for identifier in data_rows if not expected.fullmatch(identifier)]
    if invalid:
        raise ValidationError(
            f"invalid scenario identifiers for {code}: {', '.join(invalid)}; expected {code}-NN"
        )
    if len(set(data_rows)) != len(data_rows):
        raise ValidationError(f"duplicate scenario identifiers for {code}")
    return data_rows


def validate(path: Path, code: str) -> dict[str, object]:
    if not ALERT_CODE.fullmatch(code):
        raise ValidationError(f"invalid alert code: {code}")
    block = alert_block(path.read_text(encoding="utf-8"), code)
    bodies = section_bodies(block)
    actual_sections = tuple(bodies)
    if actual_sections != REQUIRED_SECTIONS:
        missing = [name for name in REQUIRED_SECTIONS if name not in bodies]
        unexpected = [name for name in actual_sections if name not in REQUIRED_SECTIONS]
        raise ValidationError(
            "section structure mismatch"
            + (f"; missing: {', '.join(missing)}" if missing else "")
            + (f"; unexpected: {', '.join(unexpected)}" if unexpected else "")
            + ("; required sections must remain in template order" if not missing and not unexpected else "")
        )
    empty = [name for name, body in bodies.items() if not substantive(body)]
    if empty:
        raise ValidationError(f"sections contain no specification content: {', '.join(empty)}")
    identifiers = scenario_ids(bodies["Scenario matrix"], code)
    return {
        "result": "pass",
        "alertCode": code,
        "requiredSections": len(REQUIRED_SECTIONS),
        "scenarioIdentifiers": identifiers,
        "structuralReadiness": "ready-for-integration-review",
        "connectedEvidence": "not-validated",
    }


def self_test() -> dict[str, object]:
    section_text = []
    for name in REQUIRED_SECTIONS:
        if name == "Scenario matrix":
            body = (
                "| Scenario ID | Starting state | Laboratory action | Expected source state | "
                "Expected standalone result | Deferred connected evidence |\n"
                "| --- | --- | --- | --- | --- | --- |\n"
                "| A01-00 | Baseline | Act | Changed | Deterministic result | Deferred |"
            )
        else:
            body = "Recorded content."
        section_text.append(f"### {name}\n\n{body}")
    valid = "# Supporting specification\n\n## A01 — Test alert\n\n" + "\n\n".join(section_text)
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "spec.md"
        path.write_text(valid, encoding="utf-8")
        result = validate(path, "A01")
        path.write_text(valid.replace("A01-00", "B01-00"), encoding="utf-8")
        try:
            validate(path, "A01")
        except ValidationError:
            invalid_id_rejected = True
        else:
            invalid_id_rejected = False
        path.write_text(valid.replace("### Approval record", "### Removed approval record"), encoding="utf-8")
        try:
            validate(path, "A01")
        except ValidationError:
            missing_section_rejected = True
        else:
            missing_section_rejected = False
        duplicate = valid.replace(
            "| A01-00 | Baseline | Act | Changed | Deterministic result | Deferred |",
            "| A01-00 | Baseline | Act | Changed | Deterministic result | Deferred |\n"
            "| A01-00 | Baseline | Act | Changed | Duplicate result | Deferred |",
        )
        path.write_text(duplicate, encoding="utf-8")
        try:
            validate(path, "A01")
        except ValidationError:
            duplicate_scenario_rejected = True
        else:
            duplicate_scenario_rejected = False
    if not invalid_id_rejected or not missing_section_rejected or not duplicate_scenario_rejected:
        raise ValidationError("self-test failed to reject an invalid specification")
    return {
        "result": "pass",
        "validSpecificationAccepted": result["result"] == "pass",
        "invalidScenarioRejected": True,
        "missingSectionRejected": True,
        "duplicateScenarioRejected": True,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("specification", type=Path, nargs="?")
    parser.add_argument("alert_code", nargs="?")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        if args.self_test:
            result = self_test()
        else:
            if args.specification is None or args.alert_code is None:
                parser.error("specification and alert_code are required unless --self-test is used")
            result = validate(args.specification, args.alert_code.upper())
    except (OSError, ValidationError) as error:
        raise SystemExit(f"validation failed: {error}") from error
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
