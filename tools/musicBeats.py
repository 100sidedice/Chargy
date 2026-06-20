import librosa
import json
import sys

def generate_beatmap(audio_file, output_file="beatmap.json"):
    # Load audio file
    y, sr = librosa.load(audio_file, sr=None)

    # Detect beats
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)

    # Convert beat frames to milliseconds
    beat_times_sec = librosa.frames_to_time(beat_frames, sr=sr)
    beat_times_ms = [round(t * 1000) for t in beat_times_sec]

    beatmap = {
        "bpm": round(float(tempo), 2),
        "beats": beat_times_ms
    }

    with open(output_file, "w") as f:
        json.dump(beatmap, f, indent=2)

    print(f"BPM: {beatmap['bpm']}")
    print(f"Detected {len(beat_times_ms)} beats")
    print(f"Saved to {output_file}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python beatmap.py song.mp3")
        sys.exit(1)

    generate_beatmap(sys.argv[1])