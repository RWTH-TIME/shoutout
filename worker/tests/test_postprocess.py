import time

import pandas as pd

from shoutout_worker.diarization_postprocess import remove_overlaps


def turns(rows):
    frame = pd.DataFrame(rows, columns=["Speaker", "Start", "End"])
    frame["Duration"] = frame.End - frame.Start
    return frame


def as_tuples(frame):
    return [(r.Speaker, round(r.Start, 3), round(r.End, 3)) for r in frame.itertuples()]


def test_enclosed_turns_split_the_outer_turn():
    result = remove_overlaps(turns([("A", 0, 10), ("B", 3, 4), ("B", 6, 7)]))
    assert as_tuples(result) == [
        ("A", 0, 3), ("B", 3, 4), ("A", 4, 6), ("B", 6, 7), ("A", 7, 10),
    ]


def test_partial_overlap_is_kept():
    result = remove_overlaps(turns([("A", 0, 5), ("B", 4, 8)]))
    assert as_tuples(result) == [("A", 0, 5), ("B", 4, 8)]


def test_deep_nesting_is_fast():
    # The recursive version needed ~95 s for depth 300 (#174).
    rows = [("AB"[i % 2], float(i), 5000.0 - i) for i in range(2000)]
    started = time.perf_counter()
    result = remove_overlaps(turns(rows))
    assert time.perf_counter() - started < 2
    assert result.Start.is_monotonic_increasing
