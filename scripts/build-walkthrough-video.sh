#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

VIDEOS_DIR="public/videos"
SHOTS_DIR="public/images/walkthrough"
OUT="$VIDEOS_DIR/hero-story-ua.mp4"

mkdir -p /tmp/walk

# 1. UA cinematic clips → 1280x720 with fade
for f in mother-night grandma-generator volunteer-packages children-receiving; do
  ffmpeg -y -i "$VIDEOS_DIR/ua/$f.mp4" \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x0f1d3a,fade=in:st=0:d=0.4,fade=out:st=4.6:d=0.4" \
    -r 25 -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -an "/tmp/walk-ua-$f.mp4" 2>&1 | tail -1
done

# 2. Phone-screen clips — без overlay text (voiceover объяснит)
# zoompan создаёт лёгкий ken-burns эффект
render_shot() {
  local in_name="$1"
  local in_path="$SHOTS_DIR/$in_name"
  local out_path="/tmp/walk-$(basename $in_name .png).mp4"
  ffmpeg -y -loop 1 -t 5 -i "$in_path" \
    -filter_complex "color=size=1280x720:color=0x0f1d3a:duration=5[bg];[0:v]scale=420:910:force_original_aspect_ratio=decrease,setsar=1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,fade=in:st=0:d=0.4,fade=out:st=4.6:d=0.4[out]" \
    -map "[out]" -t 5 -r 25 -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -an \
    "$out_path" 2>&1 | tail -1
}

render_shot "01-feed.png"
render_shot "02-deal.png"
render_shot "03-amount-selected.png"

# Verify all clips exist
ls -la /tmp/walk-*.mp4

# 3. Concat — 11 клипов × 5s = 55s для покрытия 53s audio с eleven_v3 + emotion tags.
cat > /tmp/walk/concat.txt <<EOF
file '/tmp/walk-ua-mother-night.mp4'
file '/tmp/walk-ua-grandma-generator.mp4'
file '/tmp/walk-ua-volunteer-packages.mp4'
file '/tmp/walk-ua-children-receiving.mp4'
file '/tmp/walk-01-feed.mp4'
file '/tmp/walk-02-deal.mp4'
file '/tmp/walk-03-amount-selected.mp4'
file '/tmp/walk-ua-mother-night.mp4'
file '/tmp/walk-ua-volunteer-packages.mp4'
file '/tmp/walk-ua-grandma-generator.mp4'
file '/tmp/walk-ua-children-receiving.mp4'
EOF

ffmpeg -y -f concat -safe 0 -i /tmp/walk/concat.txt \
  -c copy -movflags +faststart "$OUT" 2>&1 | tail -3

ls -la "$OUT"
