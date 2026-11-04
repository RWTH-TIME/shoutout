from __future__ import annotations

import pandas as pd


def remove_overlaps(df: pd.DataFrame) -> pd.DataFrame:
    """Cut speaker turns around the turns they fully enclose.

    A turn that contains shorter turns of other speakers (interjections) is split
    so the inner turn takes precedence and the outer one resumes afterwards:
    ``A[0-10] + B[3-4] -> A[0-3], B[3-4], A[4-10]``. Turns that only partially
    overlap are left as they are; ``create_section_table`` keeps such overlaps.

    Single pass with a stack of open turns, O(n log n). The previous recursive
    implementation grew roughly cubically with the nesting depth (#174).
    """
    if df.empty:
        return df.copy().reset_index(drop=True)

    frame = df.sort_values("Start", kind="stable").reset_index(drop=True)
    records = frame.to_dict("records")
    pieces: list[dict] = []
    # Each entry: [record, resume_at]; resume_at is None while a child is open.
    stack: list[list] = []

    def emit(record: dict, start: float, end: float) -> None:
        if end - start > 0:
            piece = dict(record)
            piece["Start"] = start
            piece["End"] = end
            piece["Duration"] = end - start
            pieces.append(piece)

    def close() -> None:
        record, resume_at = stack.pop()
        if resume_at is not None:
            emit(record, resume_at, record["End"])
        if stack:
            stack[-1][1] = record["End"]

    for record in records:
        # Close every open turn that does not enclose this one: it either ended
        # already or only overlaps partially.
        while stack and stack[-1][0]["End"] < record["End"]:
            close()
        if stack:
            parent = stack[-1]
            if parent[1] is not None:
                emit(parent[0], parent[1], record["Start"])
            parent[1] = None
        stack.append([record, record["Start"]])
    while stack:
        close()

    result = pd.DataFrame(pieces, columns=frame.columns)
    return result.sort_values("Start", kind="stable").reset_index(drop=True)


def aggregate_section(df: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, float | str]] = []
    current_speaker = None
    section_start = None
    section_end = None

    for row in df.itertuples(index=False):
        speaker = row.Speaker
        if current_speaker is None:
            current_speaker = speaker
            section_start = row.Start
            section_end = row.End
        elif current_speaker == speaker:
            section_end = row.End
        else:
            rows.append(
                {
                    "Speaker": current_speaker,
                    "Start": section_start,
                    "End": section_end,
                    "Duration": section_end - section_start,
                }
            )
            current_speaker = speaker
            section_start = row.Start
            section_end = row.End

    if current_speaker is not None:
        rows.append(
            {
                "Speaker": current_speaker,
                "Start": section_start,
                "End": section_end,
                "Duration": section_end - section_start,
            }
        )
    return pd.DataFrame(rows)


def create_section_table(df: pd.DataFrame) -> pd.DataFrame:
    sections: list[dict[str, float | str]] = []
    last_stop_time = 0.0
    for row in df.itertuples(index=False):
        start = row.Start if row.Start < last_stop_time else last_stop_time
        sections.append({"Speaker": row.Speaker, "Start": start, "End": row.End})
        last_stop_time = row.End
    return pd.DataFrame(sections, columns=["Speaker", "Start", "End"])
