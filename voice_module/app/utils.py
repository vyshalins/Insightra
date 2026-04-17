"""Helper utilities for the voice module."""

import subprocess
import os

def convert_to_wav(input_path: str) -> str:
    output_path = input_path.replace(".m4a", ".wav")

    # Run ffmpeg command
    command = [
        "ffmpeg",
        "-y",  # overwrite if exists
        "-i", input_path,
        output_path
    ]

    subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    return output_path