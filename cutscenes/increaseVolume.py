from moviepy import VideoFileClip

video = VideoFileClip("cutscenes/toSpacestation.mp4")
new_audio = video.audio.with_volume_scaled(1.5)  # Increase volume by 50%
video = video.with_audio(new_audio)
video.write_videofile("cutscenes/toSpacestation_louder.mp4", codec="libx264", audio_codec="aac")