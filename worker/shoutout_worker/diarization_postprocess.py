from __future__ import annotations

import pandas as pd


def remove_overlaps(df: pd.DataFrame) -> pd.DataFrame:
    frame = df.copy().reset_index(drop=True)
    index = 0
    while index < len(frame) - 1:
        section = frame[(frame.End <= frame.iloc[index].End)].iloc[index:].copy()
        if len(section) < 2:
            index += 1
            continue

        for offset in range(len(section)):
            if len(section.iloc[offset].compare(frame.iloc[index + offset])) > 0:
                section = section.iloc[:offset].copy()
                break
        if len(section) < 2:
            index += 1
            continue

        row = 1
        while row < len(section) - 1:
            nested = section[(section.End <= section.iloc[row].End)].iloc[row:]
            if len(nested) >= 1:
                section = pd.concat(
                    [
                        section.iloc[:row].copy(),
                        remove_overlaps(section.iloc[row:].copy()),
                    ]
                )
            row += 1

        frame = pd.concat(
            [
                frame.iloc[:index].copy(),
                split_overlap(section),
                frame.iloc[index + len(section) :].copy(),
            ]
        ).reset_index(drop=True)
        index += 1
    return frame


def split_overlap(df: pd.DataFrame) -> pd.DataFrame:
    frame = df.copy().reset_index(drop=True)
    index = 0
    while index < len(frame) - 1:
        next_gap = 1
        while next_gap + index < len(frame) - 1:
            if frame.iloc[index + next_gap].End >= frame.iloc[index + next_gap + 1].Start:
                next_gap += 1
            else:
                break

        frame = pd.concat([frame, frame.iloc[index].to_frame().T], ignore_index=True)
        frame.iloc[index, frame.columns.get_loc("End")] = frame.iloc[index + 1].Start
        frame.iloc[index, frame.columns.get_loc("Duration")] = (
            frame.iloc[index].End - frame.iloc[index].Start
        )
        frame.iloc[-1, frame.columns.get_loc("Start")] = frame.iloc[index + next_gap].End
        frame.iloc[-1, frame.columns.get_loc("Duration")] = (
            frame.iloc[-1].End - frame.iloc[-1].Start
        )
        if frame.iloc[-1].Duration == 0.0:
            frame = frame.iloc[:-1].copy()
        frame = frame.sort_values("Start", ascending=True).reset_index(drop=True)
        index += next_gap + 1
    return frame


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
