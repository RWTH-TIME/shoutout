"""
This module runs diarization and Transcription algorithm (whisper)
on an audio file and store results
"""
import time
import torch
import whisper
from pydub import AudioSegment
import pandas as pd
from pyannote.audio import Pipeline

from config.environment import ConfigEntry


class TranscriptionManager:
    """
    Handles all the functions for transcription.
    """

    def _aggregate_section(self, df):
        aggregated_rows = []
        # Initialize variables to track the current section
        current_speaker, section_start, section_end = None, None, None
        for _, row in df.iterrows():
            speaker = row["Speaker"]

            if current_speaker is None:
                current_speaker = speaker
                section_start = row["Start"]
                section_end = row["End"]
            elif current_speaker == speaker:
                section_end = row["End"]
            else:
                # Start a new section, add the aggregated row
                aggregated_rows.append(
                    {
                        "Speaker": current_speaker,
                        "Start": section_start,
                        "End": section_end,
                        "Duration": section_end - section_start,
                    }
                )

                current_speaker = speaker
                section_start = row["Start"]
                section_end = row["End"]

        # Add the last section
        if current_speaker is not None:
            aggregated_rows.append(
                {
                    "Speaker": current_speaker,
                    "Start": section_start,
                    "End": section_end,
                    "Duration": section_end - section_start,
                }
            )

        aggregated_df = pd.DataFrame(aggregated_rows)
        return aggregated_df

    def diarize(self, path, audio, num_speaker):
        audio_file = rf"{path}{audio.rsplit('.',1)[0]}.wav"
        diarization_pl = Pipeline.from_pretrained(
            "pyannote/speaker-diarization@2.1"
        )
        if torch.cuda.is_available():
            diarization_pl.to(torch.device("cuda"))

        # create wav-file
        if audio.rsplit(".", 1)[1] != "wav":
            fileformat = audio.rsplit(".", 1)[1]
            track = AudioSegment.from_file(
                rf"{path}{audio}", format=fileformat
            )
            track.export(audio_file, format="wav")

        if num_speaker == 0:
            diarization = diarization_pl(audio_file)
        else:
            diarization = diarization_pl(
                audio_file,
                num_speakers=int(num_speaker)
            )

        # dump the diarization output using RTTM format
        with open(
            rf"{path}/{audio.rsplit('.',1)[0]}_diarized.rttm",
            "w",
            encoding="utf-8",
        ) as rttm:
            diarization.write_rttm(rttm)

        del diarization_pl

    def transcribe(self, path, audio, language):
        model = whisper.load_model(ConfigEntry.WHISPER_MODEL)
        df = pd.read_csv(
            rf"{path}/{audio.rsplit('.',1)[0]}_diarized.rttm",
            sep=" ",
            header=None,
            names=[
                "Object",
                "Filename",
                "Number",
                "Start",
                "Duration",
                "NA",
                "NA1",
                "Speaker",
                "NA2",
                "NA3",
            ],
        )
        df["End"] = df.Start + df.Duration
        df = self._remove_overlaps(df)
        sections = self._create_section_table(
            self._aggregate_section(df[df.Duration > 1].copy())
        )
        self._run_whisper(path, audio, sections, model, language)
        del model.encoder
        del model.decoder
        torch.cuda.empty_cache()

    def _remove_overlaps(self, df):
        i = 0
        while i < len(df) - 1:
            # Check for interupts (overlaps at the End are ignored)
            if len(df[(df.End <= df.iloc[i].End)].iloc[i:]) < 2:
                i += 1
                continue

            # Overlapping section is processed
            df_section = df[(df.End <= df.iloc[i].End)].iloc[i:].copy()

            # Checking for skipped lines due to overlaps which enclose speakers
            # in the next long section (not wanted!).
            # If so, the section is shortened.
            for f in range(len(df_section)):
                if len(df_section.iloc[f].compare(df.iloc[i + f])) > 0:
                    df_section = df_section.iloc[:f].copy()
                    break
            if len(df_section) < 2:
                i += 1
                continue

            # Check for nested sections
            row = 1
            while row < len(df_section) - 1:
                if (
                    len(
                        df_section[
                            (df_section.End <= df_section.iloc[row].End)
                        ].iloc[row:]
                    )
                    > 1
                ):
                    # Recursive call for nested interupts
                    df_section = pd.concat(
                        [
                            df_section.iloc[:row].copy(),
                            self._remove_overlaps(
                                df_section.iloc[row:].copy()
                            ),
                        ]
                    )

                row += 1
            # Removing overlaps
            df = pd.concat(
                [
                    df.iloc[:i].copy(),
                    self._split_overlap(df_section),
                    df.iloc[i + len(df_section):].copy(),
                ]
            )

        return df

    def _split_overlap(self, df):
        i = 0
        while i < len(df) - 1:
            next_gap = 1
            while next_gap + i < len(df) - 1:
                if (
                    df.iloc[i + next_gap].End
                    >= df.iloc[i + next_gap + 1].Start
                ):
                    next_gap += 1
                else:
                    break

            df = pd.concat([df, df.iloc[i].to_frame().T])
            df.iloc[i, 10] = df.iloc[i + 1].Start
            df.iloc[i, 4] = df.iloc[i].End - df.iloc[i].Start
            df.iloc[-1, 3] = df.iloc[i + next_gap].End
            df.iloc[-1, 4] = df.iloc[-1].End - df.iloc[-1].Start
            df.sort_values("Start", ascending=True, inplace=True)

            i += next_gap + 1

        return df

    def _create_section_table(self, df):
        # dataframe with section ( speaker, Starttime, stoptime) is created
        sections = pd.DataFrame(columns=["Speaker", "Start", "End"])
        last_stop_time = 0

        # each section Start at the End of the last section or earlier,
        # if there is an overlap identified.
        for _, row in df.iterrows():
            if row.Start < last_stop_time:  # Overlap found
                sections.loc[len(sections)] = [row.Speaker, row.Start, row.End]
            else:
                sections.loc[len(sections)] = [
                    row.Speaker,
                    last_stop_time,
                    row.End,
                ]
            last_stop_time = row.End
        return sections

    def _run_whisper(self, path, audio, sections, model, language):
        # Transcriptions for every audio section are created and concatenated.
        # If a section dataframe is provided as argument.
        result = ""

        # Transcribing each section by splitting the audiofile,
        # transcribing seperately and concatenating the results.
        audiofile = AudioSegment.from_file(
            rf"{path}/{audio.rsplit('.',1)[0]}.wav", format="wav"
        )

        for _, section in sections.iterrows():
            tempfile_path = (
                rf"{path}/{audio.rsplit('.',1)[0]}_current_section.wav"
            )

            # create temporary wav-file for current section and transcribing it
            audiofile[
                section.Start * 1000: (section.End + 0.3) * 1000
            ].export(tempfile_path, format="WAV")
            result_section = model.transcribe(
                tempfile_path,
                language=language
            )

            # inserting Speaker and timestamp
            result += (
                section.Speaker
                + " "
                + time.strftime("%H:%M:%S", time.gmtime(section.Start))
                + "\n"
            )
            result += result_section["text"] + "\n" + "\n"

        with open(
            f"{ConfigEntry.TMP_FILE_DIR}/{audio.rsplit('.',1)[0]}"
            f"{ConfigEntry.FINISHED_FILE_FORMAT}",
            "w",
            encoding="utf-8",
        ) as file:
            file.write(result)
